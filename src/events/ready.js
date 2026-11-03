const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { getDatabase } = require('../database/connection');
const { runMigrations } = require('../database/migrations');
const { auditService } = require('../services/auditService');
const { dashboardService } = require('../services/dashboardService');
const { commandSyncService } = require('../services/commandSyncService');
const { configLoader } = require('../config/loader');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(readyClient, client) {
    const db = getDatabase();
    runMigrations(db);

    auditService.setDiscordClient(client);
    dashboardService.startAutoRefresh(client);

    await commandSyncService.syncCommands(client).catch((err) => {
      logger.error({ error: err.message }, 'Erreur lors de la synchronisation automatique des commandes slash');
    });

    const summary = configLoader.getSafeSummary();
    const config = configLoader.getConfig();
    const botName = config && config.bot && config.bot.name ? config.bot.name : 'Bot';
    logger.info(
      {
        tag: readyClient.user.tag,
        id: readyClient.user.id,
        ...summary
      },
      `Bot ${botName} prêt et connecté à Discord`
    );
  }
};
