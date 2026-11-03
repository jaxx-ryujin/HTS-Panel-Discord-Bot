const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { formatBytes, formatCpu, formatTime, translateServerState, parseHexColor } = require('../utils/formatters');
const { buildCustomId } = require('../utils/customIds');
const { buildServerSelectRow } = require('./serverSelector');

function buildDashboardContainer({
  server,
  resources,
  serversList = [],
  config,
  isOwner = false,
  isPublic = false
}) {
  const container = new ContainerBuilder();

  const botName = (config && config.bot && config.bot.name ? config.bot.name : 'WISP Control').trim();
  const stateInfo = translateServerState(resources ? resources.currentState : 'unavailable');
  let accentHex = config.dashboard.accentColor;
  if (resources) {
    if (resources.currentState === 'running') {
      accentHex = config.dashboard.onlineColor;
    } else if (resources.currentState === 'offline') {
      accentHex = config.dashboard.offlineColor;
    } else if (resources.currentState === 'starting' || resources.currentState === 'stopping') {
      accentHex = config.dashboard.warningColor;
    } else if (resources.currentState === 'unavailable') {
      accentHex = config.dashboard.offlineColor;
    }
  }
  container.setAccentColor(parseHexColor(accentHex));

  const headerContent = `# ${botName.toUpperCase()} PANEL\n### Gestion de votre serveur`;
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerContent));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const serverEmoji = server.emoji ? `${server.emoji} ` : '';
  let statusBanner = '';
  if (resources && resources.currentState === 'unavailable') {
    statusBanner = `### ⚪ STATUT INDISPONIBLE\n**Serveur :** ${server.name} ${serverEmoji}`;
  } else if (resources && resources.currentState === 'offline') {
    statusBanner = `### 🔴 SERVEUR HORS LIGNE\n**Serveur :** ${server.name} ${serverEmoji}`;
  } else if (resources && resources.currentState === 'running') {
    statusBanner = `### 🟢 SERVEUR EN LIGNE\n**Serveur :** ${server.name} ${serverEmoji}`;
  } else if (resources && resources.currentState === 'starting') {
    statusBanner = `### 🟡 SERVEUR EN DÉMARRAGE\n**Serveur :** ${server.name} ${serverEmoji}`;
  } else if (resources && resources.currentState === 'stopping') {
    statusBanner = `### 🟠 SERVEUR EN COURS D'ARRÊT\n**Serveur :** ${server.name} ${serverEmoji}`;
  } else {
    statusBanner = `### ${stateInfo.indicator} SERVEUR ${stateInfo.label.toUpperCase()}\n**Serveur :** ${server.name} ${serverEmoji}`;
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statusBanner));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let statsContent = '### 📊 STATISTIQUES\n\n';
  if (resources && resources.currentState !== 'offline' && resources.currentState !== 'unavailable') {
    const cpuStr = formatCpu(resources.cpu.currentPercent);
    const ramUsed = formatBytes(resources.memory.usedBytes);
    const ramMax = resources.memory.limitBytes > 0 ? formatBytes(resources.memory.limitBytes) : 'Illimitée';
    const diskUsed = formatBytes(resources.disk.usedBytes);
    const diskMax = resources.disk.limitBytes > 0 ? formatBytes(resources.disk.limitBytes) : 'Illimité';

    statsContent += `> ⚡ **CPU :** \`${cpuStr}\`\n`;
    statsContent += `> 🧠 **RAM :** \`${ramUsed} / ${ramMax}\`\n`;
    statsContent += `> 💾 **Disque :** \`${diskUsed} / ${diskMax}\``;

    if (resources.query && resources.query.maxplayers > 0) {
      statsContent += `\n> 👥 **Joueurs :** \`${resources.query.numplayers} / ${resources.query.maxplayers}\``;
    }
  } else if (resources && resources.currentState === 'offline') {
    statsContent += '`Serveur éteint (ressources inactives)`';
  } else if (resources && resources.currentState === 'unavailable') {
    statsContent += '`Statut du panel : Indisponible`';
    if (resources.errorMessage) {
      statsContent += `\n*Détail : ${resources.errorMessage}*`;
    }
  } else {
    statsContent += '`Impossible de récupérer les ressources actuelles`';
  }

  const timezone = config.bot.timezone || 'Europe/Brussels';
  const updatedTime = formatTime(resources ? resources.fetchedAt : Date.now(), timezone);
  statsContent += `\n\n*Dernière mise à jour : ${updatedTime}*`;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(statsContent));

  const serverId = server.id;

  const powerButtons = [
    new ButtonBuilder()
      .setCustomId(buildCustomId('power', 'start', serverId))
      .setLabel('Démarrer')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Success)
      .setDisabled(resources && resources.currentState === 'running'),
    new ButtonBuilder()
      .setCustomId(buildCustomId('power', 'restart_confirm', serverId))
      .setLabel('Redémarrer')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!resources || resources.currentState === 'offline' || resources.currentState === 'unavailable'),
    new ButtonBuilder()
      .setCustomId(buildCustomId('power', 'stop_confirm', serverId))
      .setLabel('Arrêter')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!resources || resources.currentState === 'offline' || resources.currentState === 'unavailable')
  ];

  if (isOwner && !isPublic) {
    powerButtons.push(
      new ButtonBuilder()
        .setCustomId(buildCustomId('power', 'kill_confirm', serverId))
        .setLabel('Kill')
        .setEmoji('💀')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!resources || resources.currentState === 'offline' || resources.currentState === 'unavailable')
    );
  }

  powerButtons.push(
    new ButtonBuilder()
      .setCustomId(buildCustomId('nav', 'refresh', serverId))
      .setLabel('Actualiser')
      .setEmoji('🔃')
      .setStyle(ButtonStyle.Secondary)
  );

  const powerRow = new ActionRowBuilder().addComponents(powerButtons);
  container.addActionRowComponents(powerRow);

  const navigationRow = new ActionRowBuilder();
  navigationRow.addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('nav', 'console', serverId))
      .setLabel('Console')
      .setEmoji('💻')
      .setStyle(ButtonStyle.Secondary)
  );

  if (isOwner && !isPublic) {
    if (config.features.backups) {
      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(buildCustomId('nav', 'backups', serverId))
          .setLabel('Backups')
          .setEmoji('💾')
          .setStyle(ButtonStyle.Secondary)
      );
    }
    if (config.features.auditLogs) {
      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(buildCustomId('nav', 'logs', serverId))
          .setLabel('Logs')
          .setEmoji('📜')
          .setStyle(ButtonStyle.Secondary)
      );
    }
  }

  container.addActionRowComponents(navigationRow);

  if (config.features.multiServer && serversList.length > 1) {
    const selectRow = buildServerSelectRow(serversList, serverId);
    container.addActionRowComponents(selectRow);
  }

  return container;
}

module.exports = {
  buildDashboardContainer
};
