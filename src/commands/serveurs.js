const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const { configLoader } = require('../config/loader');
const { wispResourcesService } = require('../services/wisp/resources');
const { translateServerState, parseHexColor } = require('../utils/formatters');
const { buildServerSelectRow } = require('../components/serverSelector');

const data = new SlashCommandBuilder()
  .setName('serveurs')
  .setDescription('Afficher la liste des serveurs de jeux configurés');

async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

  const config = configLoader.getConfig();
  const servers = configLoader.getEnabledServers();

  const container = new ContainerBuilder();
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🎮 SERVEURS WISP CONFIGURÉS\n### Liste des instances gérées')
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let body = '';
  for (const server of servers) {
    let stateLabel = 'Vérification...';
    let indicator = '⚪';
    try {
      const res = await wispResourcesService.getServerResources(server.id);
      const stateInfo = translateServerState(res.currentState);
      stateLabel = stateInfo.label;
      indicator = stateInfo.indicator;
    } catch {
      stateLabel = 'Inaccessible';
      indicator = '🔴';
    }

    const emoji = server.emoji ? `${server.emoji} ` : '';
    body += `${indicator} **${server.name} ${emoji}**\n`;
    body += `└ ID: \`${server.id}\` | État: **${stateLabel}**\n\n`;
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  if (servers.length > 1) {
    const selectRow = buildServerSelectRow(servers);
    container.addActionRowComponents(selectRow);
  }

  return interaction.editReply({
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

module.exports = {
  data,
  execute
};
