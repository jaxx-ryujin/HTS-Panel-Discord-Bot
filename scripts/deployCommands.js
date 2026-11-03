const { REST, Routes } = require('discord.js');
const { configLoader } = require('../src/config/loader');
const { commandSyncService } = require('../src/services/commandSyncService');
const logger = require('../src/utils/logger');

async function deploy(force = false) {
  try {
    configLoader.load();
    const env = configLoader.getEnv();
    const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

    try {
      const globalCommands = await rest.get(Routes.applicationCommands(env.DISCORD_CLIENT_ID));
      if (Array.isArray(globalCommands) && globalCommands.length > 0) {
        logger.info(`Nettoyage de ${globalCommands.length} commande(s) globale(s) pour supprimer les doublons...`);
        await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: [] });
        logger.info('Anciennes commandes globales purgées.');
      }
    } catch (globalErr) {
      logger.warn({ error: globalErr.message }, 'Vérification des commandes globales ignorée');
    }

    const localCommands = commandSyncService.getLocalCommandsJson();
    let existingCommands = [];
    try {
      existingCommands = await rest.get(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
      );
    } catch {}

    const hasChanged = commandSyncService.haveCommandsChanged(existingCommands, localCommands);

    if (!force && !hasChanged) {
      logger.info(
        `Commandes slash déjà synchronisées et identiques sur le serveur Discord (${existingCommands.length} commandes). Aucun appel réseau superflu pour préserver les quotas Discord.`
      );
      return;
    }

    logger.info(`Déploiement atomique de ${localCommands.length} commandes slash sur le serveur ${env.DISCORD_GUILD_ID}...`);

    const result = await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
      { body: localCommands }
    );

    logger.info(`Succès : ${result.length} commandes slash enregistrées sans doublon.`);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Échec du déploiement des commandes');
    process.exit(1);
  }
}

if (require.main === module) {
  const isForce = process.argv.includes('--force') || process.argv.includes('-f');
  deploy(isForce);
}

module.exports = { deploy };
