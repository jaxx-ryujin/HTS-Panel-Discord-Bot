const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { configLoader } = require('../config/loader');
const { wispServersService } = require('../services/wisp/servers');
const { wispResourcesService } = require('../services/wisp/resources');
const { dashboardService } = require('../services/dashboardService');

function resolveServerId(input) {
  if (!input) return null;
  const directServer = configLoader.getServerById(input);
  if (directServer) return directServer.id;
  const servers = configLoader.getEnabledServers();
  const matchByName = servers.find((s) => s.name.toLowerCase() === input.toLowerCase());
  if (matchByName) return matchByName.id;
  const matchPartial = servers.find((s) => s.name.toLowerCase().includes(input.toLowerCase()));
  if (matchPartial) return matchPartial.id;
  return input;
}

const data = new SlashCommandBuilder()
  .setName('refresh')
  .setDescription('Actualiser les données et vider le cache d\'un serveur')
  .addStringOption((opt) =>
    opt
      .setName('serveur')
      .setDescription('Choisir le serveur WISP')
      .setRequired(false)
      .setAutocomplete(true)
  );

async function autocomplete(interaction) {
  const focusedValue = (interaction.options.getFocused() || '').toLowerCase();
  let servers = [];
  try {
    servers = configLoader.getEnabledServers();
  } catch {
    servers = [];
  }
  const filtered = servers.filter((s) =>
    s.name.toLowerCase().includes(focusedValue) || s.id.toLowerCase().includes(focusedValue)
  ).slice(0, 25);

  await interaction.respond(
    filtered.map((s) => ({
      name: `${s.name} ${s.emoji ? `${s.emoji}` : ''}`,
      value: s.id
    }))
  );
}

async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

  const serverInput = interaction.options.getString('serveur');
  const serverId = resolveServerId(serverInput);
  const server = (serverId && configLoader.getServerById(serverId)) || configLoader.getDefaultServer();

  if (server) {
    wispServersService.clearCache(server.id);
    wispResourcesService.invalidateCache(server.id);
  } else {
    wispServersService.clearCache();
    wispResourcesService.invalidateCache();
  }

  const payload = await dashboardService.buildDashboardPayload({
    serverId: server ? server.id : null,
    userId: interaction.user.id,
    isPublic: false
  });

  return interaction.editReply(payload);
}

module.exports = {
  data,
  autocomplete,
  execute
};
