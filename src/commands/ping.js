const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const { wispClient } = require('../services/wisp/client');
const { configLoader } = require('../config/loader');
const { parseHexColor } = require('../utils/formatters');

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Vérifier la latence Discord et la disponibilité du panel WISP');

async function execute(interaction) {
  const sent = await interaction.deferReply({
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    fetchReply: true
  });

  const discordLatency = sent.createdTimestamp - interaction.createdTimestamp;
  const wsHeartbeat = interaction.client.ws.ping;

  const wispStart = Date.now();
  let wispStatus = 'En ligne';
  let wispLatency = 0;
  try {
    await wispClient.get('/servers');
    wispLatency = Date.now() - wispStart;
  } catch {
    wispStatus = 'Inaccessible';
    wispLatency = Date.now() - wispStart;
  }

  const config = configLoader.getConfig();
  const container = new ContainerBuilder();
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🏓 LATENCE & DISPONIBILITÉ\n### État des connexions du bot')
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let body = `• **Latence Discord (Round-trip) :** \`${discordLatency} ms\`\n`;
  body += `• **Heartbeat WebSocket Discord :** \`${wsHeartbeat >= 0 ? wsHeartbeat : 0} ms\`\n`;
  body += `• **API REST WISP :** \`${wispLatency} ms\` (${wispStatus === 'En ligne' ? '🟢 Accessible' : '🔴 Erreur'})\n`;
  body += `• **Adresse du panel :** \`${configLoader.getPanelUrl()}\``;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  return interaction.editReply({
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

module.exports = {
  data,
  execute
};
