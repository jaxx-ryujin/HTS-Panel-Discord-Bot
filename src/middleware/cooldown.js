class CooldownManager {
  constructor(defaultCooldownMs = 1500) {
    this.defaultCooldownMs = defaultCooldownMs;
    this.cooldowns = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  isCoolingDown(userId, actionKey, customDurationMs = null) {
    const key = `${userId}:${actionKey}`;
    const now = Date.now();
    const expiry = this.cooldowns.get(key);
    if (expiry && now < expiry) {
      return Math.ceil((expiry - now) / 1000);
    }
    const duration = customDurationMs || this.defaultCooldownMs;
    this.cooldowns.set(key, now + duration);
    return false;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.cooldowns.entries()) {
      if (now >= expiry) {
        this.cooldowns.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cooldowns.clear();
  }
}

const cooldownManager = new CooldownManager();

module.exports = {
  CooldownManager,
  cooldownManager
};
