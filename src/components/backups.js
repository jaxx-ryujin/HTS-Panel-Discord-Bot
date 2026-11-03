const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const { formatBytes, formatDate, parseHexColor } = require('../utils/formatters');
const { buildCustomId } = require('../utils/customIds');

function buildBackupsContainer({ server, backups = [], config, selectedBackupUuid = null }) {
  const container = new ContainerBuilder();
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  const serverEmoji = server.emoji ? `${server.emoji} ` : '';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# GESTION DES SAUVEGARDES\n**Serveur :** ${server.name} ${serverEmoji}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let backupsListText = '### DERNIÈRES SAUVEGARDES\n\n';
  if (backups.length === 0) {
    backupsListText += '*Aucune sauvegarde existante sur ce serveur.*';
  } else {
    for (const b of backups.slice(0, 10)) {
      const lockIcon = b.isLocked ? ' 🔒' : '';
      const statusIcon = b.isSuccessful ? '✅' : '⏳';
      const sizeStr = formatBytes(b.bytes);
      const isSelected = selectedBackupUuid === b.uuid;
      const marker = isSelected ? '▶ ' : '';
      const dateStr = b.createdAt ? formatDate(b.createdAt, config.bot.timezone) : '';
      backupsListText += `${marker}${statusIcon} **${b.name}**${lockIcon} (${sizeStr}) - ${dateStr}\n`;
    }
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(backupsListText));

  if (backups.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(buildCustomId('backups', 'select_item', server.id))
      .setPlaceholder('Sélectionner une sauvegarde');

    const options = backups.slice(0, 25).map((b) => {
      return new StringSelectMenuOptionBuilder()
        .setLabel(b.name.slice(0, 100))
        .setValue(b.uuid)
        .setDescription(`${formatBytes(b.bytes)} - ${b.uuid.slice(0, 8)}`)
        .setDefault(b.uuid === selectedBackupUuid);
    });

    selectMenu.addOptions(options);
    container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));
  }

  const actionsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('backups', 'create_modal', server.id))
      .setLabel('Créer une backup')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildCustomId('backups', 'restore_confirm', server.id))
      .setLabel('Restaurer')
      .setEmoji('♻️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!selectedBackupUuid),
    new ButtonBuilder()
      .setCustomId(buildCustomId('backups', 'delete_confirm', server.id))
      .setLabel('Supprimer')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!selectedBackupUuid),
    new ButtonBuilder()
      .setCustomId(buildCustomId('backups', 'refresh', server.id))
      .setLabel('Actualiser')
      .setEmoji('🔃')
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionsRow);

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('nav', 'dashboard', server.id))
      .setLabel('Retour au Panel')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(navRow);

  return container;
}

module.exports = {
  buildBackupsContainer
};
