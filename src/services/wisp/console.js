const { wispClient } = require('./client');
const { sanitizeConsoleCommand } = require('../../utils/validators');

class WispConsoleService {
  constructor(client = wispClient) {
    this.client = client;
    this.maxCommandLength = 500;
  }

  async sendCommand(serverId, command) {
    const sanitized = sanitizeConsoleCommand(command);
    if (!sanitized) {
      throw new Error('La commande console ne peut pas être vide');
    }
    if (sanitized.length > this.maxCommandLength) {
      throw new Error(`La commande dépasse la longueur maximale autorisée (${this.maxCommandLength} caractères)`);
    }

    const response = await this.client.post(`/servers/${serverId}/command`, {
      command: sanitized
    });

    return response.status === 204 || response.status === 200;
  }
}

const wispConsoleService = new WispConsoleService();

module.exports = {
  WispConsoleService,
  wispConsoleService
};
