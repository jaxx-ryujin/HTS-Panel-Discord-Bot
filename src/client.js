const { Client, GatewayIntentBits, Collection } = require('discord.js');
const logger = require('./utils/logger');
const { closeDatabase } = require('./database/connection');
const { wispWebSocketService } = require('./services/wisp/websocket');
const { dashboardService } = require('./services/dashboardService');

const panelCommand = require('./commands/panel');
const serveursCommand = require('./commands/serveurs');
const statusCommand = require('./commands/status');
const logsCommand = require('./commands/logs');
const refreshCommand = require('./commands/refresh');
const pingCommand = require('./commands/ping');
const helpCommand = require('./commands/help');
const setupCommand = require('./commands/setup');

const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');

function createDiscordClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages
    ]
  });

  client.commands = new Collection();
  const commands = [
    panelCommand,
    serveursCommand,
    statusCommand,
    logsCommand,
    refreshCommand,
    pingCommand,
    helpCommand,
    setupCommand
  ];

  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }

  client.once(readyEvent.name, (...args) => readyEvent.execute(...args, client));
  client.on(interactionCreateEvent.name, (...args) => interactionCreateEvent.execute(...args, client));

  const shutdown = async () => {
    let botName = 'Bot';
    try {
      const cfg = configLoader.getConfig();
      if (cfg && cfg.bot && cfg.bot.name) botName = cfg.bot.name;
    } catch {}
    logger.info(`Arrêt du bot ${botName} en cours...`);
    dashboardService.stopAutoRefresh();
    wispWebSocketService.disconnectAll();
    closeDatabase();
    await client.destroy();
    logger.info('Arrêt propre terminé.');
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return client;
}

module.exports = {
  createDiscordClient
};
