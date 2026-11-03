const { getDatabase } = require('../connection');

class DashboardRepository {
  constructor(db = null) {
    this.db = db;
  }

  getDb() {
    return this.db || getDatabase();
  }

  saveDashboard(channelId, messageId, defaultServerId = null) {
    const db = this.getDb();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO dashboards (channel_id, message_id, default_server_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        message_id = excluded.message_id,
        default_server_id = excluded.default_server_id,
        updated_at = excluded.updated_at
    `);
    stmt.run(channelId, messageId, defaultServerId, now, now);
  }

  getDashboardByChannel(channelId) {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM dashboards WHERE channel_id = ?');
    return stmt.get(channelId) || null;
  }

  getAllDashboards() {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM dashboards');
    return stmt.all();
  }

  deleteDashboard(channelId) {
    const db = this.getDb();
    const stmt = db.prepare('DELETE FROM dashboards WHERE channel_id = ?');
    return stmt.run(channelId).changes > 0;
  }
}

const dashboardRepository = new DashboardRepository();
dashboardRepository.DashboardRepository = DashboardRepository;

module.exports = dashboardRepository;
