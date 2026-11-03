const { getDatabase } = require('../connection');

class SettingsRepository {
  constructor(db = null) {
    this.db = db;
  }

  getDb() {
    return this.db || getDatabase();
  }

  getSetting(key, defaultValue = null) {
    const db = this.getDb();
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key);
    if (!row) {
      return defaultValue;
    }
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  setSetting(key, value) {
    const db = this.getDb();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(key, serialized, now);
  }
}

const settingsRepository = new SettingsRepository();
settingsRepository.SettingsRepository = SettingsRepository;

module.exports = settingsRepository;
