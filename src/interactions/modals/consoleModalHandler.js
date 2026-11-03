const { MessageFlags } = require('discord.js');
const { configLoader } = require('../../config/loader');
const { permissionService } = require('../../services/permissionService');
const { wispConsoleService } = require('../../services/wisp/console');
const { wispWebSocketService } = require('../../services/wisp/websocket');
const { wispResourcesService } = require('../../services/wisp/resources');
const { auditService } = require('../../services/auditService');
const { buildConsoleContainer } = require('../../components/console');
const { buildPermissionDeniedContainer } = require('../../components/error');

async function handleConsoleModal(interaction, parsedId) {
  const { serverId } = parsedId;
  const server = configLoader.getServerById(serverId);
  if (!server) {
    throw new Error('Serveur non trouvé');
  }

  if (!permissionService.canAccessConsole(interaction)) {
    const denied = buildPermissionDeniedContainer();
    return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  }

  const commandText = interaction.fields.getTextInputValue('command_text');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

  await wispConsoleService.sendCommand(server.id, commandText);

  await auditService.recordAction({
    action: 'Commande console',
    serverId: server.id,
    serverName: server.name,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    result: 'Envoyée',
    details: commandText
  });

  const resources = await wispResourcesService.getServerResources(server.id).catch(() => null);
  const recentLogs = wispWebSocketService.getRecentLogs(server.id);

  const container = buildConsoleContainer({
    server,
    resources,
    recentLogs,
    config: configLoader.getConfig()
  });

  return interaction.editReply({
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

module.exports = {
  handleConsoleModal
};
