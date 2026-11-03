const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

let dbInstance = null;

function initializeDatabase(customPath = null) {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = customPath || path.resolve(process.cwd(), 'data', 'wisp_control.sqlite');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');

  return dbInstance;
}

function getDatabase() {
  if (!dbInstance) {
    return initializeDatabase();
  }
  return dbInstance;
}

function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};
