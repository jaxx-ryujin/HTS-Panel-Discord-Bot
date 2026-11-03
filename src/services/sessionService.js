const crypto = require('node:crypto');

class SessionService {
  constructor(ttlMs = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
    this.confirmations = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  getUserSession(userId) {
    const existing = this.sessions.get(userId);
    const now = Date.now();
    if (existing) {
      if (now - existing.updatedAt > this.ttlMs) {
        this.sessions.delete(userId);
        return this.createUserSession(userId);
      }
      existing.updatedAt = now;
      return existing;
    }
    return this.createUserSession(userId);
  }

  createUserSession(userId, initialData = {}) {
    const session = {
      userId,
      selectedServerId: null,
      currentDirectory: '/',
      fileListPage: 1,
      backupListPage: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...initialData
    };
    this.sessions.set(userId, session);
    return session;
  }

  setSelectedServer(userId, serverId) {
    const session = this.getUserSession(userId);
    session.selectedServerId = serverId;
    session.currentDirectory = '/';
    session.fileListPage = 1;
    session.updatedAt = Date.now();
    return session;
  }

  setCurrentDirectory(userId, directory) {
    const session = this.getUserSession(userId);
    session.currentDirectory = directory;
    session.fileListPage = 1;
    session.updatedAt = Date.now();
    return session;
  }

  createConfirmation(userId, data, expireInSeconds = 60) {
    const token = crypto.randomBytes(8).toString('hex');
    const confirmation = {
      token,
      userId,
      data,
      expiresAt: Date.now() + expireInSeconds * 1000
    };
    this.confirmations.set(token, confirmation);
    return token;
  }

  getConfirmation(token) {
    const confirmation = this.confirmations.get(token);
    if (!confirmation) {
      return null;
    }
    if (Date.now() > confirmation.expiresAt) {
      this.confirmations.delete(token);
      return null;
    }
    return confirmation;
  }

  consumeConfirmation(token, userId) {
    const confirmation = this.getConfirmation(token);
    if (!confirmation) {
      return null;
    }
    if (confirmation.userId !== userId) {
      return null;
    }
    this.confirmations.delete(token);
    return confirmation.data;
  }

  cancelConfirmation(token) {
    this.confirmations.delete(token);
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > this.ttlMs) {
        this.sessions.delete(userId);
      }
    }
    for (const [token, conf] of this.confirmations.entries()) {
      if (now > conf.expiresAt) {
        this.confirmations.delete(token);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
    this.confirmations.clear();
  }
}

const sessionService = new SessionService();

module.exports = {
  SessionService,
  sessionService
};
