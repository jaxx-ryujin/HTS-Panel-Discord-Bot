function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboards (
      channel_id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      default_server_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      server_id TEXT,
      server_name TEXT,
      user_id TEXT NOT NULL,
      user_tag TEXT,
      result TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_server_id ON audit_logs (server_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

module.exports = {
  runMigrations
};
