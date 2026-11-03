const { wispClient } = require('./client');

class WispBackupsService {
  constructor(client = wispClient) {
    this.client = client;
  }

  normalizeBackup(item) {
    const data = item.attributes || item;
    return {
      uuid: data.uuid,
      name: data.name,
      isSuccessful: Boolean(data.is_successful),
      isLocked: Boolean(data.is_locked),
      bytes: Number(data.bytes || data.size || 0),
      checksum: data.checksum || null,
      completedAt: data.completed_at || null,
      createdAt: data.created_at || null
    };
  }

  async listBackups(serverId) {
    const response = await this.client.get(`/servers/${serverId}/backups`);
    const rawList = response.data && response.data.data ? response.data.data : [];
    return rawList.map((item) => this.normalizeBackup(item));
  }

  async createBackup(serverId, name = null) {
    const payload = {};
    if (name && typeof name === 'string' && name.trim()) {
      payload.name = name.trim();
    }

    const response = await this.client.post(`/servers/${serverId}/backups`, payload);
    const data = response.data && response.data.attributes ? response.data.attributes : response.data;
    return this.normalizeBackup(data);
  }

  async restoreBackup(serverId, backupUuid) {
    const response = await this.client.post(`/servers/${serverId}/backups/${backupUuid}/restore`, {});
    return response.status === 204 || response.status === 200;
  }

  async deleteBackup(serverId, backupUuid) {
    const response = await this.client.delete(`/servers/${serverId}/backups/${backupUuid}`);
    return response.status === 204 || response.status === 200;
  }

  async getDownloadUrl(serverId, backupUuid) {
    const response = await this.client.get(`/servers/${serverId}/backups/${backupUuid}/download`);
    const data = response.data && response.data.attributes ? response.data.attributes : response.data;
    return data.url || null;
  }
}

const wispBackupsService = new WispBackupsService();

module.exports = {
  WispBackupsService,
  wispBackupsService
};
