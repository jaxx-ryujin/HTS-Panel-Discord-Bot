const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const { permissionService } = require('../services/permissionService');
const { configLoader } = require('../config/loader');
const { wispClient } = require('../services/wisp/client');
const { getDatabase } = require('../database/connection');
const { parseHexColor } = require('../utils/formatters');
const { buildPermissionDeniedContainer } = require('../components/error');

const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('[Owner] Exécuter le diagnostic de configuration et de connectivité');

async function execute(interaction) {
  if (!permissionService.isOwner(interaction.user.id)) {
    const denied = buildPermissionDeniedContainer();
    return interaction.reply({ components: [denied], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

  const config = configLoader.getConfig();
  const env = configLoader.getEnv();

  const guild = await interaction.client.guilds.fetch(env.DISCORD_GUILD_ID).catch(() => null);
  const dashboardChannel = await interaction.client.channels.fetch(config.discord.dashboardChannelId).catch(() => null);
  const logsChannel = await interaction.client.channels.fetch(config.discord.logsChannelId).catch(() => null);

  let wispApiOk = false;
  let wispErrorDetail = '';
  try {
    await wispClient.get('/servers');
    wispApiOk = true;
  } catch (err) {
    wispErrorDetail = err.message;
  }

  let dbOk = false;
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT 1 as test').get();
    dbOk = row && row.test === 1;
  } catch {}

  const container = new ContainerBuilder();
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  const botName = (config && config.bot && config.bot.name ? config.bot.name : 'WISP Control').trim();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ⚙️ DIAGNOSTIC SYSTÈME ${botName.toUpperCase()}\n### Vérification de l'environnement`)
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let body = '### ÉTAT DES COMPOSANTS\n\n';
  body += `• **Serveur Discord (Guild) :** ${guild ? `✅ Connecté (\`${guild.name}\`)` : '❌ Inaccessible'}\n`;
  body += `• **Salon Dashboard :** ${dashboardChannel ? `✅ Prêt (<#${dashboardChannel.id}>)` : '❌ Introuvable ou ID invalide'}\n`;
  body += `• **Salon Logs d\'audit :** ${logsChannel ? `✅ Prêt (<#${logsChannel.id}>)` : '❌ Introuvable ou ID invalide'}\n`;
  body += `• **Base de données SQLite :** ${dbOk ? '✅ Fonctionnelle' : '❌ Erreur de connexion'}\n`;
  body += `• **API REST WISP :** ${wispApiOk ? '✅ En ligne et authentifiée' : `❌ Échec (${wispErrorDetail})`}\n`;
  body += `• **URL du Panel :** \`${configLoader.getPanelUrl()}\`\n`;
  body += `• **Serveurs configurés :** \`${configLoader.getEnabledServers().length} actif(s)\`\n`;
  if (guild) {
    const guildCommands = await guild.commands.fetch().catch(() => null);
    body += `• **Commandes Slash Guilde :** \`${guildCommands ? guildCommands.size : 0} active(s)\` (Doublons évités)\n`;
  }
  body += `• **Owners autorisés :** \`${configLoader.getOwnerIds().length}\`\n`;
  body += `• **Rôles autorisés :** \`${configLoader.getAllowedRoleIds().length}\`\n`;

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
