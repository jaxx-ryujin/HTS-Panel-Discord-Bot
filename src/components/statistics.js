const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { formatBytes, formatCpu, formatUptime, formatTime, translateServerState, parseHexColor } = require('../utils/formatters');
const { buildCustomId } = require('../utils/customIds');

function buildStatisticsContainer({ server, serverDetails, resources, config }) {
  const container = new ContainerBuilder();
  const stateInfo = translateServerState(resources ? resources.currentState : 'unavailable');
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  const serverEmoji = server.emoji ? `${server.emoji} ` : '';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# STATISTIQUES DU SERVEUR\n**Serveur :** ${server.name} ${serverEmoji} (\`${server.id}\`)`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let body = `**Statut :** ${stateInfo.indicator} ${stateInfo.label}\n`;
  if (serverDetails && serverDetails.node) {
    body += `**Nœud :** \`${serverDetails.node}\`\n`;
  }
  if (resources && resources.uptimeSeconds > 0) {
    body += `**Uptime :** \`${formatUptime(resources.uptimeSeconds)}\`\n`;
  }

  body += '\n### CONSOMMATION DES RESSOURCES\n';
  if (resources && resources.currentState !== 'offline' && resources.currentState !== 'unavailable') {
    const cpuStr = formatCpu(resources.cpu.currentPercent);
    const cpuLimit = resources.cpu.limitPercent > 0 ? `${resources.cpu.limitPercent}%` : 'Illimité';
    const ramUsed = formatBytes(resources.memory.usedBytes);
    const ramMax = resources.memory.limitBytes > 0 ? formatBytes(resources.memory.limitBytes) : 'Illimitée';
    const diskUsed = formatBytes(resources.disk.usedBytes);
    const diskMax = resources.disk.limitBytes > 0 ? formatBytes(resources.disk.limitBytes) : 'Illimité';
    const netRx = formatBytes(resources.network.rxBytes);
    const netTx = formatBytes(resources.network.txBytes);

    body += `> ⚡ **CPU :** \`${cpuStr}\` (Limite: ${cpuLimit})\n`;
    body += `> 🧠 **Mémoire RAM :** \`${ramUsed} / ${ramMax}\`\n`;
    body += `> 💾 **Espace Disque :** \`${diskUsed} / ${diskMax}\`\n`;
    body += `> 📥 **Réseau Reçu (RX) :** \`${netRx}\`\n`;
    body += `> 📤 **Réseau Émis (TX) :** \`${netTx}\`\n`;
    if (resources.query && resources.query.maxplayers > 0) {
      body += `> 👥 **Joueurs connectés :** \`${resources.query.numplayers} / ${resources.query.maxplayers}\`\n`;
    }
  } else if (resources && resources.currentState === 'offline') {
    body += '*Le serveur est actuellement éteint.*\n';
  } else if (resources && resources.currentState === 'unavailable') {
    body += `*Statut du panel : Indisponible${resources.errorMessage ? ` (${resources.errorMessage})` : ''}.*\n`;
  } else {
    body += '*Données de ressources non disponibles.*\n';
  }

  const timezone = config.bot.timezone || 'Europe/Brussels';
  const updatedTime = formatTime(resources ? resources.fetchedAt : Date.now(), timezone);
  body += `\n*Dernière actualisation : ${updatedTime}*`;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('stats', 'refresh', server.id))
      .setLabel('Actualiser')
      .setEmoji('🔃')
      .setStyle(ButtonStyle.Primary),
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
  buildStatisticsContainer
};
