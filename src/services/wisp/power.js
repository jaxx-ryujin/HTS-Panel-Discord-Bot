const { wispClient } = require('./client');
const { wispResourcesService } = require('./resources');

const VALID_SIGNALS = ['start', 'stop', 'restart', 'kill'];

class WispPowerService {
  constructor(client = wispClient, resourcesService = wispResourcesService) {
    this.client = client;
    this.resourcesService = resourcesService;
  }

  async sendPowerSignal(serverId, signal) {
    const normalizedSignal = String(signal || '').toLowerCase();
    if (!VALID_SIGNALS.includes(normalizedSignal)) {
      throw new Error(`Signal d'alimentation invalide: ${signal}. Signaux valides: ${VALID_SIGNALS.join(', ')}`);
    }

    const response = await this.client.post(`/servers/${serverId}/power`, {
      signal: normalizedSignal
    });

    if (normalizedSignal === 'start' || normalizedSignal === 'restart') {
      if (this.resourcesService && typeof this.resourcesService.recordStarting === 'function') {
        this.resourcesService.recordStarting(serverId);
      }
    } else if (normalizedSignal === 'stop' || normalizedSignal === 'kill') {
      if (this.resourcesService && typeof this.resourcesService.clearStarting === 'function') {
        this.resourcesService.clearStarting(serverId);
      }
    }

    this.resourcesService.invalidateCache(serverId);

    return response.status === 204 || response.status === 200;
  }
}

const wispPowerService = new WispPowerService();

module.exports = {
  VALID_SIGNALS,
  WispPowerService,
  wispPowerService
};
