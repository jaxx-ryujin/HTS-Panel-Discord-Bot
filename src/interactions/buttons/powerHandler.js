const { MessageFlags, ButtonStyle } = require('discord.js');
const { configLoader } = require('../../config/loader');
const { permissionService } = require('../../services/permissionService');
const { sessionService } = require('../../services/sessionService');
const { auditService } = require('../../services/auditService');
const { wispPowerService } = require('../../services/wisp/power');
const { buildConfirmationContainer } = require('../../components/confirmation');
const { buildErrorContainer } = require('../../components/error');
const { buildCustomId } = require('../../utils/customIds');

async function handlePowerButton(interaction, parsedId) {
  const { action, serverId } = parsedId;
  const server = configLoader.getServerById(serverId);
  if (!server) {
    const errorContainer = buildErrorContainer({
      title: 'SERVEUR INTROUVABLE',
      message: 'Ce serveur n\'est plus configuré ou activé.'
    });
    return interaction.reply({
      components: [errorContainer],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }

  if (action === 'start') {
    if (!permissionService.canControlPower(interaction)) {
      throw new Error('Vous n\'êtes pas autorisé à démarrer ce serveur.');
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    await wispPowerService.sendPowerSignal(serverId, 'start');

    await auditService.recordAction({
      action: 'Démarrage du serveur',
      serverId,
      serverName: server.name,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      result: 'Succès'
    });

    const { dashboardService } = require('../../services/dashboardService');
    const userDashboard = await dashboardService.buildDashboardPayload({
      serverId,
      userId: interaction.user.id,
      isPublic: false
    });

    return interaction.editReply(userDashboard);
  }

  if (action === 'stop_confirm' || action === 'restart_confirm' || action === 'kill_confirm') {
    const isKill = action === 'kill_confirm';
    if (isKill && !permissionService.canForceKill(interaction)) {
      throw new Error('Seuls les Owners peuvent forcer l\'arrêt immédiat (Kill).');
    }
    if (!isKill && !permissionService.canControlPower(interaction)) {
      throw new Error('Vous n\'êtes pas autorisé à modifier l\'état d\'alimentation.');
    }

    const signalType = isKill ? 'kill' : action === 'stop_confirm' ? 'stop' : 'restart';
    const actionLabel = isKill ? 'Forcer l\'arrêt (Kill)' : action === 'stop_confirm' ? 'Arrêter' : 'Redémarrer';

    const token = sessionService.createConfirmation(interaction.user.id, {
      type: 'power',
      serverId,
      signal: signalType,
      actionLabel
    });

    const confirmCustomId = buildCustomId('confirm', 'execute', serverId, token);
    const cancelCustomId = buildCustomId('confirm', 'cancel', serverId, token);

    const container = buildConfirmationContainer({
      title: `CONFIRMATION : ${actionLabel.toUpperCase()}`,
      description: `Tu es sur le point de **${actionLabel.toLowerCase()}** le serveur suivant :`,
      targetName: server.name,
      warningMessage: 'Cette opération peut interrompre les sessions de jeu des utilisateurs connectés.',
      confirmCustomId,
      cancelCustomId,
      confirmLabel: actionLabel,
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
  handlePowerButton
};
