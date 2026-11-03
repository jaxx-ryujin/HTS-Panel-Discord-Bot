const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { parseHexColor } = require('../utils/formatters');
const { buildCustomId } = require('../utils/customIds');

function buildConfirmationContainer({
  title = 'CONFIRMATION REQUISE',
  description,
  targetName,
  warningMessage = 'Cette opération peut interrompre les joueurs actuellement connectés ou modifier des données.',
  confirmCustomId,
  cancelCustomId,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  confirmStyle = ButtonStyle.Danger,
  config
}) {
  const container = new ContainerBuilder();
  const warningColor = config && config.dashboard ? config.dashboard.warningColor : '#FEE75C';
  container.setAccentColor(parseHexColor(warningColor));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ⚠️ ${title}\n### Action sensible en attente`)
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let body = `${description}\n\n`;
  if (targetName) {
    body += `**Cible :** \`${targetName}\`\n\n`;
  }
  body += `> ⚠️ **Attention :** ${warningMessage}\n\n*Cliquez sur l'un des boutons ci-dessous pour valider ou annuler l'action.*`;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmCustomId)
      .setLabel(confirmLabel)
      .setEmoji('✅')
      .setStyle(confirmStyle),
    new ButtonBuilder()
      .setCustomId(cancelCustomId)
      .setLabel(cancelLabel)
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow);

  return container;
}

module.exports = {
  buildConfirmationContainer
};
