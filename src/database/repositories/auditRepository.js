const { getDatabase } = require('../connection');

class AuditRepository {
  constructor(db = null) {
    this.db = db;
  }

  getDb() {
    return this.db || getDatabase();
  }

  createLog({ action, serverId = null, serverName = null, userId, userTag = null, result, details = null }) {
    const db = this.getDb();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, server_id, server_name, user_id, user_tag, result, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(action, serverId, serverName, userId, userTag, result, details, now);
    return {
      id: info.lastInsertRowid,
      action,
      serverId,
      serverName,
      userId,
      userTag,
      result,
      details,
      createdAt: now
    };
  }

  getRecentLogs({ serverId = null, limit = 20, offset = 0 } = {}) {
    const db = this.getDb();
    if (serverId) {
      const stmt = db.prepare(`
        SELECT * FROM audit_logs
        WHERE server_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(serverId, limit, offset);
    }
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  purgeOldLogs(retentionDays = 30) {
    const db = this.getDb();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const stmt = db.prepare('DELETE FROM audit_logs WHERE created_at < ?');
    return stmt.run(cutoff).changes;
  }
}

const auditRepository = new AuditRepository();
auditRepository.AuditRepository = AuditRepository;

module.exports = auditRepository;
