const {
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const { configLoader } = require('../../config/loader');
const { permissionService } = require('../../services/permissionService');
const { wispResourcesService } = require('../../services/wisp/resources');
const { wispWebSocketService } = require('../../services/wisp/websocket');
const { buildConsoleContainer } = require('../../components/console');
const { buildPermissionDeniedContainer } = require('../../components/error');
const { buildCustomId } = require('../../utils/customIds');

async function handleConsoleButton(interaction, parsedId) {
  const { action, serverId } = parsedId;
  const server = configLoader.getServerById(serverId);
  if (!server) {
    throw new Error('Serveur non trouvé ou non configuré');
  }

  if (!permissionService.canAccessConsole(interaction)) {
    const denied = buildPermissionDeniedContainer();
    return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  }

  if (action === 'open_modal') {
    const modal = new ModalBuilder()
      .setCustomId(buildCustomId('console', 'command_modal', server.id))
      .setTitle(`Console : ${server.name.slice(0, 30)}`);

    const commandInput = new TextInputBuilder()
      .setCustomId('command_text')
      .setLabel('Commande à exécuter')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: say Bonjour à tous')
      .setRequired(true)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder().addComponents(commandInput));

    return interaction.showModal(modal);
  }

  if (action === 'refresh') {
    const resources = await wispResourcesService.getServerResources(server.id).catch(() => null);
    const recentLogs = wispWebSocketService.getRecentLogs(server.id);

    const container = buildConsoleContainer({
      server,
      resources,
      recentLogs,
      config: configLoader.getConfig()
    });

    return interaction.update({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
  }
}

module.exports = {
  handleConsoleButton
};
