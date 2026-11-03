const { MessageFlags } = require('discord.js');
const { configLoader } = require('../../config/loader');
const { permissionService } = require('../../services/permissionService');
const { wispBackupsService } = require('../../services/wisp/backups');
const { auditService } = require('../../services/auditService');
const { buildBackupsContainer } = require('../../components/backups');
const { buildPermissionDeniedContainer } = require('../../components/error');

async function handleBackupsModal(interaction, parsedId) {
  const { serverId } = parsedId;
  const server = configLoader.getServerById(serverId);
  if (!server) {
    throw new Error('Serveur non trouvé');
  }

  if (!permissionService.canManageBackups(interaction)) {
    const denied = buildPermissionDeniedContainer();
    return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  }

  let backupName = null;
  try {
    backupName = interaction.fields.getTextInputValue('backup_name');
  } catch {}

  await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

  const createdBackup = await wispBackupsService.createBackup(server.id, backupName);

  await auditService.recordAction({
    action: 'Création de sauvegarde',
    serverId: server.id,
    serverName: server.name,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    result: 'Initié',
    details: createdBackup.name || createdBackup.uuid
  });

  const backups = await wispBackupsService.listBackups(server.id);
  const container = buildBackupsContainer({
    server,
    backups,
    config: configLoader.getConfig()
  });

  return interaction.editReply({
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

module.exports = {
  handleBackupsModal
};
