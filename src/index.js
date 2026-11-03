const logger = require('./utils/logger');
const { configLoader } = require('./config/loader');
const { createDiscordClient } = require('./client');

process.on('unhandledRejection', (reason) => {
  logger.error({ error: reason ? reason.message || reason : 'Inconnu', stack: reason ? reason.stack : undefined }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught Exception');
  process.exit(1);
});

async function bootstrap() {
  try {
    configLoader.load();
    const config = configLoader.getConfig();
    const botName = config && config.bot && config.bot.name ? config.bot.name : 'Bot';
    logger.info(`Démarrage de ${botName}...`);
    const env = configLoader.getEnv();

    const client = createDiscordClient();
    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    logger.fatal({ error: error.message, stack: error.stack }, 'Échec du démarrage de l\'application');
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = {
  bootstrap
};
