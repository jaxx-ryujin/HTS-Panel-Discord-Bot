const { MessageFlags } = require('discord.js');
const { parseCustomId } = require('../utils/customIds');
const { permissionService } = require('../services/permissionService');
const { cooldownManager } = require('../middleware/cooldown');
const { handleInteractionError } = require('../middleware/errorHandler');
const { buildPermissionDeniedContainer } = require('../components/error');

const { handlePowerButton } = require('./buttons/powerHandler');
const { handleNavButton } = require('./buttons/navHandler');
const { handleConfirmButton } = require('./buttons/confirmHandler');
const { handleBackupsButton } = require('./buttons/backupsHandler');
const { handleConsoleButton } = require('./buttons/consoleHandler');

const { handleServerSelect } = require('./selects/serverSelectHandler');
const { handleBackupsSelect } = require('./selects/backupsSelectHandler');

const { handleConsoleModal } = require('./modals/consoleModalHandler');
const { handleBackupsModal } = require('./modals/backupsModalHandler');

async function routeInteraction(interaction) {
  try {
    if (!permissionService.validateGuild(interaction)) {
      const denied = buildPermissionDeniedContainer();
      return interaction.reply({
        components: [denied],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }

    if (!permissionService.isAuthorized(interaction)) {
      const denied = buildPermissionDeniedContainer();
      return interaction.reply({
        components: [denied],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    }

    if (interaction.isButton()) {
      const parsedId = parseCustomId(interaction.customId);
      if (!parsedId) {
        return;
      }

      const cooldownSeconds = cooldownManager.isCoolingDown(interaction.user.id, `${parsedId.module}:${parsedId.action}`);
      if (cooldownSeconds) {
        return interaction.reply({
          content: `Veuillez patienter ${cooldownSeconds}s avant de réutiliser cette action.`,
          flags: MessageFlags.Ephemeral
        });
      }

      switch (parsedId.module) {
        case 'power':
          return await handlePowerButton(interaction, parsedId);
        case 'nav':
          return await handleNavButton(interaction, parsedId);
        case 'confirm':
          return await handleConfirmButton(interaction, parsedId);
        case 'backups':
          return await handleBackupsButton(interaction, parsedId);
        case 'console':
          return await handleConsoleButton(interaction, parsedId);
        default:
          return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      const parsedId = parseCustomId(interaction.customId);
      if (!parsedId) {
        return;
      }

      switch (parsedId.module) {
        case 'dashboard':
          if (parsedId.action === 'switch_server') {
            return await handleServerSelect(interaction);
          }
          break;
        case 'backups':
          if (parsedId.action === 'select_item') {
            return await handleBackupsSelect(interaction, parsedId);
          }
          break;
        default:
          return;
      }
    }

    if (interaction.isModalSubmit()) {
      const parsedId = parseCustomId(interaction.customId);
      if (!parsedId) {
        return;
      }

      switch (parsedId.module) {
        case 'console':
          if (parsedId.action === 'command_modal') {
            return await handleConsoleModal(interaction, parsedId);
          }
          break;
        case 'backups':
          if (parsedId.action === 'create_modal') {
            return await handleBackupsModal(interaction, parsedId);
          }
          break;
        default:
          return;
      }
    }
  } catch (error) {
    await handleInteractionError(interaction, error);
  }
}

module.exports = {
  routeInteraction
};
