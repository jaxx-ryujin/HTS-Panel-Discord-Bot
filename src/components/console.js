const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { translateServerState, parseHexColor } = require('../utils/formatters');
const { buildCustomId } = require('../utils/customIds');

function buildConsoleContainer({ server, resources, recentLogs = [], config }) {
  const container = new ContainerBuilder();
  const stateInfo = translateServerState(resources ? resources.currentState : 'unavailable');
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  const serverEmoji = server.emoji ? `${server.emoji} ` : '';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# CONSOLE WISP\n**Serveur :** ${server.name} ${serverEmoji}\n**Statut :** ${stateInfo.indicator} ${stateInfo.label}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let logsBlock = '```text\n';
  if (recentLogs.length > 0) {
    logsBlock += recentLogs.join('\n');
  } else {
    logsBlock += 'Aucun flux console récent disponible.';
  }
  logsBlock += '\n```';

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(logsBlock));

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('console', 'open_modal', server.id))
      .setLabel('Envoyer une commande')
      .setEmoji('⌨️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(resources && resources.currentState === 'offline'),
    new ButtonBuilder()
      .setCustomId(buildCustomId('console', 'refresh', server.id))
      .setLabel('Actualiser')
      .setEmoji('🔃')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildCustomId('nav', 'dashboard', server.id))
      .setLabel('Retour')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow);

  return container;
}

module.exports = {
  buildConsoleContainer
};
