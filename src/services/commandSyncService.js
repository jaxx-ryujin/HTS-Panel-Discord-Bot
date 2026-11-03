const { configLoader } = require('../config/loader');
const logger = require('../utils/logger');

const panelCommand = require('../commands/panel');
const serveursCommand = require('../commands/serveurs');
const statusCommand = require('../commands/status');
const logsCommand = require('../commands/logs');
const refreshCommand = require('../commands/refresh');
const pingCommand = require('../commands/ping');
const helpCommand = require('../commands/help');
const setupCommand = require('../commands/setup');

class CommandSyncService {
  constructor(loader = configLoader) {
    this.loader = loader;
  }

  getLocalCommands() {
    return [
      panelCommand,
      serveursCommand,
      statusCommand,
      logsCommand,
      refreshCommand,
      pingCommand,
      helpCommand,
      setupCommand
    ];
  }

  getLocalCommandsJson() {
    return this.getLocalCommands().map((cmd) => cmd.data.toJSON());
  }

  normalizeOption(option) {
    if (!option) return null;
    return {
      name: option.name,
      description: option.description,
      type: option.type,
      required: Boolean(option.required),
      autocomplete: Boolean(option.autocomplete),
      options: Array.isArray(option.options)
        ? option.options
            .map((opt) => this.normalizeOption(opt))
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name))
        : []
    };
  }

  normalizeCommand(cmd) {
    const rawOptions = cmd.options || [];
    return {
      name: cmd.name,
      description: cmd.description,
      type: cmd.type || 1,
      options: rawOptions
        .map((opt) => this.normalizeOption(opt))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  haveCommandsChanged(existingCommandsCollection, localCommandsJson) {
    const existingList = Array.from(existingCommandsCollection.values());
    if (existingList.length !== localCommandsJson.length) {
      return true;
    }

    const normalizedExisting = existingList
      .map((cmd) => this.normalizeCommand(cmd))
      .sort((a, b) => a.name.localeCompare(b.name));

    const normalizedLocal = localCommandsJson
      .map((cmd) => this.normalizeCommand(cmd))
      .sort((a, b) => a.name.localeCompare(b.name));

    return JSON.stringify(normalizedExisting) !== JSON.stringify(normalizedLocal);
  }

  async syncCommands(client, options = { force: false }) {
    const env = this.loader.getEnv();
    const guildId = env.DISCORD_GUILD_ID;

    if (!guildId) {
      logger.warn('Aucun DISCORD_GUILD_ID configuré, synchronisation des commandes ignorée.');
      return false;
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      logger.error(`Impossible d'accéder au serveur Discord configuré (ID: ${guildId}).`);
      return false;
    }

    try {
      if (client.application) {
        const globalCommands = await client.application.commands.fetch().catch(() => null);
        if (globalCommands && globalCommands.size > 0) {
          logger.info(`Nettoyage de ${globalCommands.size} ancienne(s) commande(s) globale(s) pour éviter les doublons...`);
          await client.application.commands.set([]);
          logger.info('Anciennes commandes globales purgées avec succès.');
        }
      }
    } catch (cleanError) {
      logger.warn({ error: cleanError.message }, 'Impossible de vérifier ou nettoyer les commandes globales.');
    }

    const localCommands = this.getLocalCommandsJson();
    const existingGuildCommands = await guild.commands.fetch().catch(() => null);

    const needsUpdate =
      options.force ||
      !existingGuildCommands ||
      this.haveCommandsChanged(existingGuildCommands, localCommands);

    if (!needsUpdate) {
      logger.info(
        `Commandes slash déjà synchronisées et à jour sur le serveur Discord (${existingGuildCommands.size} commandes). Requête réseau évitée pour respecter les limites Discord.`
      );
      return false;
    }

    logger.info(`Mise à jour des commandes slash sur le serveur privé (${localCommands.length} commandes)...`);
    const registered = await guild.commands.set(localCommands);
    logger.info(`Succès : ${registered.size} commandes slash synchronisées sur le serveur privé sans doublon.`);
    return true;
  }
}

const commandSyncService = new CommandSyncService();

module.exports = {
  CommandSyncService,
  commandSyncService
};
