const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const { permissionService } = require('../services/permissionService');
const { configLoader } = require('../config/loader');
const { parseHexColor } = require('../utils/formatters');

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Afficher le guide des commandes et fonctionnalités disponibles');

async function execute(interaction) {
  const isOwner = permissionService.isOwner(interaction.user.id);
  const config = configLoader.getConfig();

  const container = new ContainerBuilder();
  container.setAccentColor(parseHexColor(config.dashboard.accentColor));

  const roleTitle = isOwner ? '👑 NIVEAU OWNER (Accès complet)' : '🛡️ NIVEAU RÔLE AUTORISÉ (Accès limité)';
  const botName = (config && config.bot && config.bot.name ? config.bot.name : 'WISP Control').trim();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 📖 GUIDE ${botName.toUpperCase()}\n### ${roleTitle}`)
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  let body = '### 🎮 COMMANDES DISPONIBLES\n\n';
  body += '• `/panel ouvrir` : Ouvrir votre panneau de gestion personnel éphémère.\n';
  body += '• `/serveurs` : Lister tous les serveurs WISP configurés et leur statut.\n';
  body += '• `/status` : Consulter les métriques complètes CPU, RAM, Disque, Réseau.\n';
  body += '• `/refresh` : Vider le cache et rafraîchir les données en direct.\n';
  body += '• `/ping` : Mesurer la latence Discord et la connectivité WISP.\n';
  body += '• `/help` : Afficher cette documentation interactive.\n';

  if (isOwner) {
    body += '\n### 👑 COMMANDES D\'ADMINISTRATION (OWNER SEULEMENT)\n\n';
    body += '• `/panel installer` : Déployer le dashboard permanent dans le salon dédié.\n';
    body += '• `/panel actualiser` : Forcer la mise à jour du dashboard permanent.\n';
    body += '• `/logs` : Consulter l\'historique d\'audit des actions exécutées.\n';
    body += '• `/setup` : Exécuter le diagnostic complet de l\'installation et des salons.\n';
    body += '\n*Vous avez également accès à la gestion et restauration des sauvegardes, aux logs d\'audit et au forçage d\'arrêt (kill).*';
  } else {
    body += '\n*Vos permissions vous permettent d\'alimenter les serveurs (Start/Stop/Restart), de consulter la console et d\'exécuter des commandes. Les sauvegardes et logs sont restreints aux Owners.*';
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

  return interaction.reply({
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
  });
}

module.exports = {
  data,
  execute
};
