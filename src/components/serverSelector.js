const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { buildCustomId } = require('../utils/customIds');

function buildServerSelectRow(servers, currentServerId = null) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('dashboard', 'switch_server'))
    .setPlaceholder('Changer de serveur');

  const options = servers.map((server) => {
    const isSelected = server.id === currentServerId;
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(server.name)
      .setValue(server.id)
      .setDefault(isSelected);

    if (server.emoji) {
      option.setEmoji(server.emoji);
    }
    option.setDescription(`ID: ${server.id}`);
    return option;
  });

  menu.addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  buildServerSelectRow
};
