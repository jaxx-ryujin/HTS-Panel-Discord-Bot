const { MessageFlags } = require('discord.js');
const { permissionService } = require('../services/permissionService');
const { buildPermissionDeniedContainer } = require('../components/error');

function checkGuildPermission(interaction) {
  if (!permissionService.validateGuild(interaction)) {
    const container = buildPermissionDeniedContainer();
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    return interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  }
  return true;
}

function checkAuthorization(interaction) {
  if (!checkGuildPermission(interaction)) {
    return false;
  }
  if (!permissionService.isAuthorized(interaction)) {
    const container = buildPermissionDeniedContainer();
    if (interaction.deferred || interaction.replied) {
      interaction.followUp({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    } else {
      interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    return false;
  }
  return true;
}

function checkOwnerOnly(interaction) {
  if (!checkGuildPermission(interaction)) {
    return false;
  }
  if (!permissionService.isOwner(interaction.user.id)) {
    const container = buildPermissionDeniedContainer();
    if (interaction.deferred || interaction.replied) {
      interaction.followUp({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    } else {
      interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    return false;
  }
  return true;
}

module.exports = {
  checkGuildPermission,
  checkAuthorization,
  checkOwnerOnly
};
