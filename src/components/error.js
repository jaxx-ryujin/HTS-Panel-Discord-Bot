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

function buildErrorContainer({
  title = 'ERREUR',
  message,
  serverId = null,
  retryCustomId = null,
  config = null
}) {
  const container = new ContainerBuilder();
  const offlineColor = config && config.dashboard ? config.dashboard.offlineColor : '#ED4245';
  container.setAccentColor(parseHexColor(offlineColor));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ❌ ${title}\n### Une anomalie est survenue`)
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const body = `${message}\n\n*Vérifiez vos paramètres ou réessayez dans quelques instants.*`;
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  const actionRow = new ActionRowBuilder();
  if (retryCustomId) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(retryCustomId)
        .setLabel('Réessayer')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary)
    );
  }

  actionRow.addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('nav', 'dashboard', serverId || ''))
      .setLabel('Retour au Panel')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow);

  return container;
}

function buildPermissionDeniedContainer() {
  const container = new ContainerBuilder();
  container.setAccentColor(0xed4245);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🚫 ACCÈS REFUSÉ\n### Permissions insuffisantes')
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const body = 'Vous ne disposez pas des autorisations nécessaires pour exécuter cette opération.\n\n*Cette action est strictement réservée aux administrateurs ou aux rôles autorisés.*';
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  return container;
}

function buildWispUnavailableContainer({ serverId = null }) {
  const container = new ContainerBuilder();
  container.setAccentColor(0xed4245);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# ⚠️ CONNEXION WISP IMPOSSIBLE\n### Le panel ne répond pas actuellement')
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const body = 'Impossible d\'établir la communication avec le panel WISP.\n\nVérifiez la connexion au panel ou réessayez ultérieurement.';
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('nav', 'refresh', serverId || ''))
      .setLabel('Réessayer')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(buildCustomId('nav', 'dashboard', serverId || ''))
      .setLabel('Retour')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow);

  return container;
}

module.exports = {
  buildErrorContainer,
  buildPermissionDeniedContainer,
  buildWispUnavailableContainer
};
