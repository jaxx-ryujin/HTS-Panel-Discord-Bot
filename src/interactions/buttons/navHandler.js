const { MessageFlags } = require('discord.js');
const { configLoader } = require('../../config/loader');
const { permissionService } = require('../../services/permissionService');
const { sessionService } = require('../../services/sessionService');
const { wispResourcesService } = require('../../services/wisp/resources');
const { wispWebSocketService } = require('../../services/wisp/websocket');
const { wispBackupsService } = require('../../services/wisp/backups');
const { auditService } = require('../../services/auditService');
const { buildConsoleContainer } = require('../../components/console');
const { buildBackupsContainer } = require('../../components/backups');
const { buildAuditLogsListContainer } = require('../../components/auditLogs');
const { buildPermissionDeniedContainer } = require('../../components/error');

async function handleNavButton(interaction, parsedId) {
  const { action, serverId } = parsedId;
  const userSession = sessionService.getUserSession(interaction.user.id);
  const targetServerId = serverId || userSession.selectedServerId || (configLoader.getDefaultServer() ? configLoader.getDefaultServer().id : null);
  const server = configLoader.getServerById(targetServerId);

  if (!server) {
    throw new Error('Serveur non trouvé ou non configuré');
  }

  if (action === 'dashboard' || action === 'refresh') {
    const { dashboardService } = require('../../services/dashboardService');
    const payload = await dashboardService.buildDashboardPayload({
      serverId: server.id,
      userId: interaction.user.id,
      isPublic: false
    });

    if (interaction.replied || interaction.deferred) {
      return interaction.editReply(payload);
    }
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      return interaction.update(payload);
    }
    return interaction.reply(payload);
  }

  if (action === 'console') {
    if (!permissionService.canAccessConsole(interaction)) {
      const denied = buildPermissionDeniedContainer();
      return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    wispWebSocketService.connect(server.id).catch(() => {});
    const resources = await wispResourcesService.getServerResources(server.id).catch(() => null);
    const recentLogs = wispWebSocketService.getRecentLogs(server.id);

    const container = buildConsoleContainer({
      server,
      resources,
      recentLogs,
      config: configLoader.getConfig()
    });

    const payload = {
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    };

    if (interaction.isButton()) {
      return interaction.update(payload);
    }
    return interaction.reply(payload);
  }

  if (action === 'backups') {
    if (!permissionService.canManageBackups(interaction)) {
      const denied = buildPermissionDeniedContainer();
      return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    const backups = await wispBackupsService.listBackups(server.id);
    const container = buildBackupsContainer({
      server,
      backups,
      config: configLoader.getConfig()
    });

    const payload = {
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    };

    if (interaction.isButton()) {
      return interaction.update(payload);
    }
    return interaction.reply(payload);
  }

  if (action === 'logs') {
    if (!permissionService.canViewAuditLogs(interaction)) {
      const denied = buildPermissionDeniedContainer();
      return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    const logs = auditService.getRecentLogs({ serverId: server.id, limit: 15 });
    const container = buildAuditLogsListContainer({
      logs,
      server,
      config: configLoader.getConfig()
    });

    const payload = {
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    };

    if (interaction.isButton()) {
      return interaction.update(payload);
    }
    return interaction.reply(payload);
  }
}

module.exports = {
  handleNavButton
};
