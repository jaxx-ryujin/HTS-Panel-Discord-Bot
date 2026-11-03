const { wispClient } = require('./client');

class WispServersService {
  constructor(client = wispClient) {
    this.client = client;
    this.serverDetailsCache = new Map();
    this.cacheTtlMs = 60 * 1000;
  }

  normalizeServerData(raw) {
    if (!raw) return null;
    const data = raw.attributes || raw;
    return {
      identifier: data.identifier || data.id,
      uuid: data.uuid,
      name: data.name,
      description: data.description || '',
      node: data.node,
      isSuspended: Boolean(data.is_suspended),
      isInstalling: Boolean(data.is_installing),
      isTransferring: Boolean(data.is_transferring),
      limits: data.limits || {
        memory: 0,
        swap: 0,
        disk: 0,
        io: 500,
        cpu: 0
      },
      featureLimits: data.feature_limits || {
        databases: 0,
        allocations: 0,
        backups: 0
      }
    };
  }

  async listServers() {
    const response = await this.client.get('/servers');
    const rawList = response.data && response.data.data ? response.data.data : [];
    return rawList.map((item) => this.normalizeServerData(item));
  }

  async getServer(serverId) {
    const cached = this.serverDetailsCache.get(serverId);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    const response = await this.client.get(`/servers/${serverId}`);
    const normalized = this.normalizeServerData(response.data);
    this.serverDetailsCache.set(serverId, { data: normalized, timestamp: now });
    return normalized;
  }

  clearCache(serverId = null) {
    if (serverId) {
      this.serverDetailsCache.delete(serverId);
    } else {
      this.serverDetailsCache.clear();
    }
  }
}

const wispServersService = new WispServersService();

module.exports = {
  WispServersService,
  wispServersService
};
