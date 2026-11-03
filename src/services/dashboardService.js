const { MessageFlags } = require('discord.js');
const dashboardRepository = require('../database/repositories/dashboardRepository');
const { configLoader } = require('../config/loader');
const { permissionService } = require('./permissionService');
const { wispResourcesService } = require('./wisp/resources');
const { buildDashboardContainer } = require('../components/dashboard');
const logger = require('../utils/logger');

class DashboardService {
  constructor(
    repository = dashboardRepository,
    loader = configLoader,
    resourcesService = wispResourcesService,
    perms = permissionService
  ) {
    this.repository = repository;
    this.loader = loader;
    this.resourcesService = resourcesService;
    this.perms = perms;
    this.refreshInterval = null;
    this.lastRenderedHashes = new Map();
  }

  async buildDashboardPayload({ serverId = null, userId = null, isPublic = false }) {
    const config = this.loader.getConfig();
    const servers = this.loader.getEnabledServers();
    if (servers.length === 0) {
      throw new Error('Aucun serveur WISP n\'est configuré ou activé.');
    }

    const targetServer = (serverId && this.loader.getServerById(serverId)) || this.loader.getDefaultServer() || servers[0];
    const isOwner = userId ? this.perms.isOwner(userId) : false;

    let resources = null;
    try {
      resources = await this.resourcesService.getServerResources(targetServer.id);
    } catch (apiError) {
      logger.warn({ serverId: targetServer.id, error: apiError.message }, 'Failed to fetch WISP server resources');
    }

    const container = buildDashboardContainer({
      server: targetServer,
      resources,
      serversList: servers,
      config,
      isOwner,
      isPublic
    });

    const flags = isPublic
      ? MessageFlags.IsComponentsV2
      : (MessageFlags.Ephemeral | MessageFlags.IsComponentsV2);

    return {
      components: [container],
      flags
    };
  }

  async installPermanentDashboard(channel, defaultServerId = null) {
    const servers = this.loader.getEnabledServers();
    const targetServer = (defaultServerId && this.loader.getServerById(defaultServerId))
      || (this.loader.getDefaultServer() ? this.loader.getDefaultServer() : servers[0]);
    const targetServerId = targetServer ? targetServer.id : null;

    const payload = await this.buildDashboardPayload({
      serverId: targetServerId,
      isPublic: true
    });

    const message = await channel.send(payload);
    this.repository.saveDashboard(channel.id, message.id, targetServerId);

    return message;
  }

  async refreshPermanentDashboard(client, channelId) {
    const dashboardData = this.repository.getDashboardByChannel(channelId);
    if (!dashboardData) return false;

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) return false;

      const message = await channel.messages.fetch(dashboardData.message_id).catch(() => null);
      if (!message) {
        return false;
      }

      const payload = await this.buildDashboardPayload({
        serverId: dashboardData.default_server_id,
        isPublic: true
      });

      await message.edit(payload);
      return true;
    } catch (err) {
      logger.error({ channelId, error: err.message }, 'Error refreshing permanent dashboard message');
      return false;
    }
  }

  startAutoRefresh(client) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    const config = this.loader.getConfig();
    const intervalSeconds = Math.max(15, config.dashboard.refreshIntervalSeconds || 60);

    this.refreshInterval = setInterval(async () => {
      const dashboards = this.repository.getAllDashboards();
      for (const dash of dashboards) {
        await this.refreshPermanentDashboard(client, dash.channel_id);
      }
    }, intervalSeconds * 1000);

    if (this.refreshInterval.unref) {
      this.refreshInterval.unref();
    }
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

const dashboardService = new DashboardService();

module.exports = {
  DashboardService,
  dashboardService
};
