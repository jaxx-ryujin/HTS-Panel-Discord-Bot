const { Events, MessageFlags } = require('discord.js');
const { routeInteraction } = require('../interactions/router');
const { handleInteractionError } = require('../middleware/errorHandler');
const { permissionService } = require('../services/permissionService');
const { buildPermissionDeniedContainer } = require('../components/error');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!permissionService.validateGuild(interaction)) {
      if (interaction.isAutocomplete()) {
        return interaction.respond([]);
      }
      const denied = buildPermissionDeniedContainer();
      return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === 'function') {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          logger.warn({ error: error.message }, 'Autocomplete handling error');
        }
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return;
      }

      if (!permissionService.isAuthorized(interaction)) {
        const denied = buildPermissionDeniedContainer();
        return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
      return;
    }

    await routeInteraction(interaction);
  }
};
