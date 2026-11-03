const { wispClient } = require('./client');
const { wispServersService } = require('./servers');
const logger = require('../../utils/logger');

function normalizeServerState(rawStatus) {
  if (rawStatus === null || rawStatus === undefined) {
    return 'unknown';
  }
  if (typeof rawStatus === 'number') {
    switch (rawStatus) {
      case 1:
        return 'running';
      case 0:
        return 'offline';
      case 2:
        return 'starting';
      case 3:
        return 'stopping';
      default:
        return 'unknown';
    }
  }
  const str = String(rawStatus).toLowerCase().trim();
  switch (str) {
    case 'running':
    case 'online':
    case 'on':
      return 'running';
    case 'offline':
    case 'off':
    case 'stopped':
      return 'offline';
    case 'starting':
      return 'starting';
    case 'stopping':
      return 'stopping';
    case 'unavailable':
      return 'unavailable';
    default:
      return str || 'unknown';
  }
}

function normalizeLimitToBytes(limitValue) {
  if (limitValue === null || limitValue === undefined || isNaN(limitValue)) {
    return 0;
  }
  const numeric = Number(limitValue);
  if (numeric <= 0) {
    return 0;
  }
  if (numeric > 1000000) {
    return numeric;
  }
  return numeric * 1024 * 1024;
}

class WispResourcesService {
  constructor(client = wispClient, serversService = wispServersService) {
    this.client = client;
    this.serversService = serversService;
    this.cache = new Map();
    this.cacheTtlMs = 5000;
    this.startingTimers = new Map();
    this.startingMaxDurationMs = 120000;
  }

  recordStarting(serverId) {
    if (serverId) {
      this.startingTimers.set(serverId, Date.now());
    }
  }

  clearStarting(serverId) {
    if (serverId) {
      this.startingTimers.delete(serverId);
    }
  }

  detectAndExtract(raw) {
    const data = (raw && raw.attributes) || raw || {};

    let formatDetected = 'UNKNOWN';
    let rawState = null;
    let cpuPercent = 0;
    let cpuLimit = 0;
    let memoryUsedBytes = 0;
    let memoryLimitBytes = 0;
    let diskUsedBytes = 0;
    let diskLimitBytes = 0;
    let networkRxBytes = 0;
    let networkTxBytes = 0;
    let uptimeSeconds = 0;
    let query = null;
    let isSuspended = Boolean(data.is_suspended);

    if (data.process && (data.process.cpu_used !== undefined || data.process.memory_used !== undefined)) {
      formatDetected = 'WISP_PROCESS';
      rawState = data.status !== undefined ? data.status : 'running';
      cpuPercent = Number(data.process.cpu_used || 0);
      memoryUsedBytes = Number(data.process.memory_used || 0);
      diskUsedBytes = Number(data.process.disk_used || 0);
      if (data.process.network) {
        networkRxBytes = Number(data.process.network.rx_bytes || 0);
        networkTxBytes = Number(data.process.network.tx_bytes || 0);
      }
      if (data.query) {
        query = {
          numplayers: Number(data.query.numplayers || 0),
          maxplayers: Number(data.query.maxplayers || 0),
          name: data.query.name || '',
          map: data.query.map || ''
        };
      }
    } else if (data.proc && (data.proc.cpu || data.proc.memory || data.proc.disk)) {
      formatDetected = 'WISP_PROC';
      rawState = data.status;
      if (data.proc.cpu) {
        cpuPercent = Number(data.proc.cpu.total || 0);
        cpuLimit = Number(data.proc.cpu.limit || 0);
      }
      if (data.proc.memory) {
        memoryUsedBytes = Number(data.proc.memory.total || 0);
        memoryLimitBytes = normalizeLimitToBytes(data.proc.memory.limit);
      }
      if (data.proc.disk) {
        diskUsedBytes = Number(data.proc.disk.used || 0);
        diskLimitBytes = normalizeLimitToBytes(data.proc.disk.limit);
      }
    } else if (data.resources || data.current_state) {
      formatDetected = 'PTERODACTYL';
      rawState = data.current_state || data.status;
      const res = data.resources || {};
      cpuPercent = Number(res.cpu_absolute || 0);
      memoryUsedBytes = Number(res.memory_bytes || 0);
      diskUsedBytes = Number(res.disk_bytes || 0);
      networkRxBytes = Number(res.network_rx_bytes || 0);
      networkTxBytes = Number(res.network_tx_bytes || 0);
      uptimeSeconds = Number(res.uptime || 0);
    } else {
      rawState = data.status || data.current_state || data.state;
      if (data.cpu !== undefined) cpuPercent = Number(data.cpu);
      if (data.memory !== undefined) memoryUsedBytes = Number(data.memory);
      if (data.disk !== undefined) diskUsedBytes = Number(data.disk);
    }

    return {
      formatDetected,
      rawState,
      cpuPercent,
      cpuLimit,
      memoryUsedBytes,
      memoryLimitBytes,
      diskUsedBytes,
      diskLimitBytes,
      networkRxBytes,
      networkTxBytes,
      uptimeSeconds,
      query,
      isSuspended
    };
  }

  normalizeResources(raw, serverLimits = null, serverId = null) {
    const extracted = this.detectAndExtract(raw);
    let currentState = normalizeServerState(extracted.rawState);

    if (currentState === 'starting') {
      const now = Date.now();
      let firstSeen = now;
      if (serverId) {
        if (!this.startingTimers.has(serverId)) {
          this.startingTimers.set(serverId, now);
        } else {
          firstSeen = this.startingTimers.get(serverId);
        }
      }
      const elapsed = now - firstSeen;
      if (elapsed >= this.startingMaxDurationMs || (extracted.uptimeSeconds && extracted.uptimeSeconds >= 120)) {
        currentState = 'running';
      }
    } else if (serverId) {
      this.startingTimers.delete(serverId);
    }

    let memoryLimit = extracted.memoryLimitBytes;
    let diskLimit = extracted.diskLimitBytes;
    let cpuLimit = extracted.cpuLimit;

    if (serverLimits) {
      if (!memoryLimit && serverLimits.memory) {
        memoryLimit = normalizeLimitToBytes(serverLimits.memory);
      }
      if (!diskLimit && serverLimits.disk) {
        diskLimit = normalizeLimitToBytes(serverLimits.disk);
      }
      if (!cpuLimit && serverLimits.cpu) {
        cpuLimit = Number(serverLimits.cpu);
      }
    }

    return {
      formatDetected: extracted.formatDetected,
      currentState,
      isSuspended: extracted.isSuspended,
      cpu: {
        currentPercent: extracted.cpuPercent,
        limitPercent: cpuLimit
      },
      memory: {
        usedBytes: extracted.memoryUsedBytes,
        limitBytes: memoryLimit
      },
      disk: {
        usedBytes: extracted.diskUsedBytes,
        limitBytes: diskLimit
      },
      network: {
        rxBytes: extracted.networkRxBytes,
        txBytes: extracted.networkTxBytes
      },
      uptimeSeconds: extracted.uptimeSeconds,
      query: extracted.query,
      fetchedAt: Date.now()
    };
  }

  async getServerResources(serverId, forceRefresh = false) {
    const now = Date.now();
    const cached = this.cache.get(serverId);
    if (!forceRefresh && cached && now - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    let limits = null;
    try {
      const serverDetails = await this.serversService.getServer(serverId);
      if (serverDetails) {
        limits = serverDetails.limits;
      }
    } catch {}

    try {
      const response = await this.client.get(`/servers/${serverId}/resources`);
      const normalized = this.normalizeResources(response.data, limits, serverId);

      logger.info({
        serverId,
        httpStatus: response.status,
        formatDetected: normalized.formatDetected,
        normalizedState: normalized.currentState
      }, '[WISP] Resources normalized');

      this.cache.set(serverId, { data: normalized, timestamp: now });
      return normalized;
    } catch (err) {
      const status = err.statusCode || (err.response ? err.response.status : null);
      const friendly = err.message || 'Le panel ne répond pas';

      logger.warn({
        serverId,
        httpStatus: status,
        error: friendly
      }, `[WISP] GET /servers/${serverId}/resources failed`);

      const unavailableData = {
        formatDetected: 'ERROR',
        currentState: 'unavailable',
        isSuspended: false,
        httpStatus: status,
        errorMessage: friendly,
        cpu: {
          currentPercent: 0,
          limitPercent: limits && limits.cpu ? Number(limits.cpu) : 0
        },
        memory: {
          usedBytes: 0,
          limitBytes: limits && limits.memory ? normalizeLimitToBytes(limits.memory) : 0
        },
        disk: {
          usedBytes: 0,
          limitBytes: limits && limits.disk ? normalizeLimitToBytes(limits.disk) : 0
        },
        network: {
          rxBytes: 0,
          txBytes: 0
        },
        uptimeSeconds: 0,
        query: null,
        fetchedAt: now
      };

      return unavailableData;
    }
  }

  invalidateCache(serverId = null) {
    if (serverId) {
      this.cache.delete(serverId);
    } else {
      this.cache.clear();
    }
  }
}

const wispResourcesService = new WispResourcesService();

module.exports = {
  normalizeServerState,
  normalizeLimitToBytes,
  WispResourcesService,
  wispResourcesService
};
