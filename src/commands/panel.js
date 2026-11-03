const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { configLoader } = require('../config/loader');
const { permissionService } = require('../services/permissionService');
const { dashboardService } = require('../services/dashboardService');
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
  .setName('panel')
  .setDescription('Ouvrir ou gérer le panneau de contrôle WISP')
  .addSubcommand((sub) =>
    sub
      .setName('ouvrir')
      .setDescription('Ouvrir votre panneau de contrôle personnel')
      .addStringOption((opt) =>
        opt
          .setName('serveur')
          .setDescription('Choisir le serveur WISP')
          .setRequired(false)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('installer')
      .setDescription('[Owner] Installer le dashboard permanent dans le salon configuré')
      .addStringOption((opt) =>
        opt
          .setName('serveur')
          .setDescription('Choisir le serveur WISP à installer')
          .setRequired(false)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('actualiser')
      .setDescription('[Owner] Forcer l\'actualisation du dashboard permanent')
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
  const subcommand = interaction.options.getSubcommand() || 'ouvrir';

  if (subcommand === 'installer') {
    if (!permissionService.isOwner(interaction.user.id)) {
      const denied = buildPermissionDeniedContainer();
      return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const config = configLoader.getConfig();
    const channelId = config.discord.dashboardChannelId;
    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      return interaction.editReply(`Salon introuvable ou non textuel (ID configuré : \`${channelId}\`).`);
    }

    const serverInput = interaction.options.getString('serveur');
    const targetServerId = resolveServerId(serverInput);

    await dashboardService.installPermanentDashboard(channel, targetServerId);
    const installedServer = targetServerId ? configLoader.getServerById(targetServerId) : configLoader.getDefaultServer();
    const serverLabel = installedServer ? ` pour le serveur **${installedServer.name}**` : '';
    return interaction.editReply(`Le dashboard permanent a été installé avec succès dans <#${channelId}>${serverLabel}.`);
  }

  if (subcommand === 'actualiser') {
    if (!permissionService.isOwner(interaction.user.id)) {
      const denied = buildPermissionDeniedContainer();
      return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const config = configLoader.getConfig();
    const success = await dashboardService.refreshPermanentDashboard(interaction.client, config.discord.dashboardChannelId);

    if (success) {
      return interaction.editReply('Le dashboard permanent a été actualisé avec succès.');
    }
    return interaction.editReply('Impossible d\'actualiser le dashboard permanent. Vérifiez qu\'il a bien été installé avec `/panel installer`.');
  }

  const serverInput = interaction.options.getString('serveur');
  const serverId = resolveServerId(serverInput);
  const payload = await dashboardService.buildDashboardPayload({
    serverId,
    userId: interaction.user.id,
    isPublic: false
  });

  return interaction.reply({
    ...payload,
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

module.exports = {
  data,
  autocomplete,
  execute
};
