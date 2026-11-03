const { MessageFlags } = require('discord.js');
const { sessionService } = require('../../services/sessionService');
const { auditService } = require('../../services/auditService');
const { configLoader } = require('../../config/loader');
const { wispPowerService } = require('../../services/wisp/power');
const { wispBackupsService } = require('../../services/wisp/backups');
const { buildErrorContainer } = require('../../components/error');

async function handleConfirmButton(interaction, parsedId) {
  const { action, extra: token } = parsedId;

  if (action === 'cancel') {
    if (token) {
      sessionService.cancelConfirmation(token);
    }

    const { dashboardService } = require('../../services/dashboardService');
    const userDashboard = await dashboardService.buildDashboardPayload({
      serverId: parsedId.serverId || null,
      userId: interaction.user.id,
      isPublic: false
    });

    return interaction.update(userDashboard);
  }

  if (action === 'execute') {
    const confirmationData = sessionService.consumeConfirmation(token, interaction.user.id);
    if (!confirmationData) {
      const expiredContainer = buildErrorContainer({
        title: 'CONFIRMATION EXPIRÉE',
        message: 'Cette confirmation a expiré ou a déjà été traitée.'
      });
      return interaction.update({
        components: [expiredContainer],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }

    const { type, serverId } = confirmationData;
    const server = configLoader.getServerById(serverId);
    const serverName = server ? server.name : serverId;

    if (type === 'power') {
      const { signal, actionLabel } = confirmationData;
      await wispPowerService.sendPowerSignal(serverId, signal);

      await auditService.recordAction({
        action: actionLabel,
        serverId,
        serverName,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        result: 'Succès'
      });
    } else if (type === 'backup_delete') {
      const { backupUuid, backupName } = confirmationData;
      await wispBackupsService.deleteBackup(serverId, backupUuid);

      await auditService.recordAction({
        action: 'Suppression de sauvegarde',
        serverId,
        serverName,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        result: 'Succès',
        details: backupName || backupUuid
      });
    } else if (type === 'backup_restore') {
      const { backupUuid, backupName } = confirmationData;
      await wispBackupsService.restoreBackup(serverId, backupUuid);

      await auditService.recordAction({
        action: 'Restauration de sauvegarde',
        serverId,
        serverName,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        result: 'Succès',
        details: backupName || backupUuid
      });
    }

    const { dashboardService } = require('../../services/dashboardService');
    const userDashboard = await dashboardService.buildDashboardPayload({
      serverId,
      userId: interaction.user.id,
      isPublic: false
    });

    return interaction.update(userDashboard);
  }
}

module.exports = {
  handleConfirmButton
};
