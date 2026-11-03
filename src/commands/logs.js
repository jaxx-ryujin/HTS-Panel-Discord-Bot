const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { permissionService } = require('../services/permissionService');
const { configLoader } = require('../config/loader');
const { auditService } = require('../services/auditService');
const { buildAuditLogsListContainer } = require('../components/auditLogs');
const { buildPermissionDeniedContainer } = require('../components/error');

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
  .setName('logs')
  .setDescription('[Owner] Consulter l\'historique d\'audit des actions')
  .addStringOption((opt) =>
    opt
      .setName('serveur')
      .setDescription('Filtrer par serveur WISP')
      .setRequired(false)
      .setAutocomplete(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('limite')
      .setDescription('Nombre de lignes (défaut 15, max 30)')
      .setRequired(false)
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
  if (!permissionService.isOwner(interaction.user.id)) {
    const denied = buildPermissionDeniedContainer();
    return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

  const serverInput = interaction.options.getString('serveur');
  const serverId = resolveServerId(serverInput);
  const limit = Math.min(Math.max(1, interaction.options.getInteger('limite') || 15), 30);

  const server = serverId ? configLoader.getServerById(serverId) : null;
  const logs = auditService.getRecentLogs({
    serverId: server ? server.id : null,
    limit
  });

  const container = buildAuditLogsListContainer({
    logs,
    server,
    config: configLoader.getConfig()
  });

  return interaction.editReply({
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

module.exports = {
  data,
  autocomplete,
  execute
};
