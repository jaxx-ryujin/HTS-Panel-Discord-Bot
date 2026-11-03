const { MessageFlags } = require('discord.js');
const auditRepository = require('../database/repositories/auditRepository');
const { configLoader } = require('../config/loader');
const { buildAuditLogMessage } = require('../components/auditLogs');
const logger = require('../utils/logger');

class AuditService {
  constructor(repository = auditRepository, loader = configLoader) {
    this.repository = repository;
    this.loader = loader;
    this.discordClient = null;
  }

  setDiscordClient(client) {
    this.discordClient = client;
  }

  sanitizeDetails(details) {
    if (!details) return null;
    let text = typeof details === 'string' ? details : JSON.stringify(details);
    text = text.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [MASQUÉ]');
    text = text.replace(/(password|token|secret|key)=([^&\s]+)/gi, '$1=[MASQUÉ]');
    return text;
  }

  async recordAction({ action, serverId = null, serverName = null, userId, userTag = null, result, details = null }) {
    const safeDetails = this.sanitizeDetails(details);
    const logEntry = this.repository.createLog({
      action,
      serverId,
      serverName,
      userId,
      userTag,
      result,
      details: safeDetails
    });

    if (this.discordClient) {
      try {
        const config = this.loader.getConfig();
        const logsChannelId = config.discord.logsChannelId;
        if (logsChannelId && logsChannelId !== 'REMPLACER') {
          const channel = await this.discordClient.channels.fetch(logsChannelId).catch(() => null);
          if (channel && channel.isTextBased()) {
            const container = buildAuditLogMessage(logEntry, config);
            await channel.send({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }
      } catch (sendError) {
        logger.error({ error: sendError.message }, 'Audit log send to Discord failed');
      }
    }

    return logEntry;
  }

  getRecentLogs(options = {}) {
    return this.repository.getRecentLogs(options);
  }
}

const auditService = new AuditService();

module.exports = {
  AuditService,
  auditService
};
