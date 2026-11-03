const {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonStyle
} = require('discord.js');
const { configLoader } = require('../../config/loader');
const { permissionService } = require('../../services/permissionService');
const { sessionService } = require('../../services/sessionService');
const { wispBackupsService } = require('../../services/wisp/backups');
const { buildBackupsContainer } = require('../../components/backups');
const { buildConfirmationContainer } = require('../../components/confirmation');
const { buildPermissionDeniedContainer } = require('../../components/error');
const { buildCustomId } = require('../../utils/customIds');

async function handleBackupsButton(interaction, parsedId) {
  const { action, serverId } = parsedId;
  const server = configLoader.getServerById(serverId);
  if (!server) {
    throw new Error('Serveur non trouvé');
  }

  if (!permissionService.canManageBackups(interaction)) {
    const denied = buildPermissionDeniedContainer();
    return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  }

  const session = sessionService.getUserSession(interaction.user.id);

  if (action === 'refresh') {
    const backups = await wispBackupsService.listBackups(server.id);
    const container = buildBackupsContainer({
      server,
      backups,
      config: configLoader.getConfig(),
      selectedBackupUuid: session.selectedBackupUuid
    });

    return interaction.update({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }

  if (action === 'create_modal') {
    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('backups', 'create_modal', server.id))
      .setTitle('Créer une sauvegarde');

    const nameInput = new TextInputBuilder()
      .setCustomId('backup_name')
      .setLabel('Nom de la sauvegarde')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Sauvegarde avant maintenance')
      .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    return interaction.showModal(modal);
  }

  if (action === 'restore_confirm') {
    const backupUuid = session.selectedBackupUuid;
    if (!backupUuid) {
      throw new Error('Veuillez d\'abord sélectionner une sauvegarde à restaurer.');
    }

    const token = sessionService.createConfirmation(interaction.user.id, {
      type: 'backup_restore',
      serverId: server.id,
      backupUuid,
      backupName: session.selectedBackupName || backupUuid
    });

    const confirmCustomId = buildCustomId('confirm', 'execute', server.id, token);
    const cancelCustomId = buildCustomId('confirm', 'cancel', server.id, token);

    const container = buildConfirmationContainer({
      title: 'CONFIRMATION DE RESTAURATION',
      description: `Êtes-vous sûr de vouloir restaurer la sauvegarde suivante ?`,
      targetName: session.selectedBackupName || backupUuid,
      warningMessage: 'Cette opération va écraser les fichiers actuels du serveur par ceux de la sauvegarde.',
      confirmCustomId,
      cancelCustomId,
      confirmLabel: 'Restaurer les données',
      confirmStyle: ButtonStyle.Danger,
      config: configLoader.getConfig()
    });

    return interaction.reply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }

  if (action === 'delete_confirm') {
    const backupUuid = session.selectedBackupUuid;
    if (!backupUuid) {
      throw new Error('Veuillez d\'abord sélectionner une sauvegarde à supprimer.');
    }

    const token = sessionService.createConfirmation(interaction.user.id, {
      type: 'backup_delete',
      serverId: server.id,
      backupUuid,
      backupName: session.selectedBackupName || backupUuid
    });

    const confirmCustomId = buildCustomId('confirm', 'execute', server.id, token);
    const cancelCustomId = buildCustomId('confirm', 'cancel', server.id, token);

    const container = buildConfirmationContainer({
      title: 'CONFIRMATION DE SUPPRESSION',
      description: `Êtes-vous sûr de vouloir supprimer définitivement cette sauvegarde ?`,
      targetName: session.selectedBackupName || backupUuid,
      warningMessage: 'Cette archive sera définitivement purgée du panel WISP.',
      confirmCustomId,
      cancelCustomId,
      confirmLabel: 'Supprimer définitivement',
      confirmStyle: ButtonStyle.Danger,
      config: configLoader.getConfig()
    });

    return interaction.reply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }
}

module.exports = {
  handleBackupsButton
};
