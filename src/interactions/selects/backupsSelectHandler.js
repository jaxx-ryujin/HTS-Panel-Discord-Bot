const { MessageFlags } = require('discord.js');
const { sessionService } = require('../../services/sessionService');
const { configLoader } = require('../../config/loader');
const { wispBackupsService } = require('../../services/wisp/backups');
const { buildBackupsContainer } = require('../../components/backups');

async function handleBackupsSelect(interaction, parsedId) {
  const selectedUuid = interaction.values[0];
  const { serverId } = parsedId;
  const server = configLoader.getServerById(serverId);
  if (!server) {
    throw new Error('Serveur non trouvé');
  }

  const session = sessionService.getUserSession(interaction.user.id);
  session.selectedBackupUuid = selectedUuid;

  const backups = await wispBackupsService.listBackups(server.id);
  const found = backups.find((b) => b.uuid === selectedUuid);
  session.selectedBackupName = found ? found.name : selectedUuid;

  const container = buildBackupsContainer({
    server,
    backups,
    config: configLoader.getConfig(),
    selectedBackupUuid: selectedUuid
  });

  return interaction.update({
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

module.exports = {
  handleBackupsSelect
};
