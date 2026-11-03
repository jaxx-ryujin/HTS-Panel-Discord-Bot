const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { formatDate, parseHexColor } = require('../utils/formatters');
const { buildCustomId } = require('../utils/customIds');

function buildAuditLogMessage(logEntry, config) {
  const container = new ContainerBuilder();
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  const botName = (config && config.bot && config.bot.name ? config.bot.name : 'WISP Control').trim();
  const header = `# JOURNAL D'AUDIT ${botName.toUpperCase()}\n### Enregistrement d'une action administrative`;
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(header));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let body = `**Action :** \`${logEntry.action}\`\n`;
  if (logEntry.serverName || logEntry.serverId) {
    body += `**Serveur :** ${logEntry.serverName || 'Serveur'} (\`${logEntry.serverId || 'N/A'}\`)\n`;
  }
  body += `**Utilisateur :** <@${logEntry.userId}> (${logEntry.userTag || logEntry.userId})\n`;
  body += `**Résultat :** **${logEntry.result}**\n`;

  if (logEntry.details) {
    body += `**Détails :** \`${logEntry.details}\`\n`;
  }

  const dateStr = formatDate(logEntry.createdAt || Date.now(), config.bot.timezone);
  body += `\n*Horodatage : ${dateStr}*`;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  return container;
}

function buildAuditLogsListContainer({ logs = [], server = null, config }) {
  const container = new ContainerBuilder();
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  const serverHeader = server ? ` - ${server.name}` : '';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# HISTORIQUE DES LOGS D'AUDIT${serverHeader}`)
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let body = '';
  if (logs.length === 0) {
    body = '*Aucun événement enregistré dans les journaux récents.*';
  } else {
    for (const log of logs.slice(0, 15)) {
      const dateStr = formatDate(log.created_at, config.bot.timezone);
      body += `• \`${dateStr}\` | **${log.action}** | <@${log.user_id}> | ${log.result}\n`;
      if (log.details) {
        body += `  └ *${log.details.slice(0, 80)}*\n`;
      }
    }
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('logs', 'refresh', server ? server.id : ''))
      .setLabel('Actualiser')
      .setEmoji('🔃')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(buildCustomId('nav', 'dashboard', server ? server.id : ''))
      .setLabel('Retour au Panel')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow);

  return container;
}

module.exports = {
  buildAuditLogMessage,
  buildAuditLogsListContainer
};
