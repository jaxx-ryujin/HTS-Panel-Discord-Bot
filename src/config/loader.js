const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string({ message: 'DISCORD_TOKEN est obligatoire' }).min(1, 'DISCORD_TOKEN est obligatoire'),
  DISCORD_CLIENT_ID: z.string({ message: 'DISCORD_CLIENT_ID est obligatoire' }).min(1, 'DISCORD_CLIENT_ID est obligatoire'),
  DISCORD_GUILD_ID: z.string({ message: 'DISCORD_GUILD_ID est obligatoire' }).min(1, 'DISCORD_GUILD_ID est obligatoire'),
  DISCORD_OWNER_IDS: z.string({ message: 'DISCORD_OWNER_IDS est obligatoire' }).min(1, 'DISCORD_OWNER_IDS est obligatoire'),
  WISP_API_TOKEN: z.string({ message: 'WISP_API_TOKEN est obligatoire' }).min(1, 'WISP_API_TOKEN est obligatoire'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
});

const serverSchema = z.object({
  id: z.string().min(1, 'ID du serveur obligatoire'),
  name: z.string().min(1, 'Nom du serveur obligatoire'),
  emoji: z.string().default(''),
  enabled: z.boolean().default(true)
});

const privateConfigSchema = z.object({
  bot: z.object({
    name: z.string({ message: 'bot.name est obligatoire' }).min(1, 'bot.name ne peut pas être vide'),
    language: z.string().default('fr'),
    guildOnly: z.boolean().default(true),
    timezone: z.string().default('Europe/Brussels')
  }),
  discord: z.object({
    dashboardChannelId: z.string().min(1, 'discord.dashboardChannelId obligatoire'),
    logsChannelId: z.string().min(1, 'discord.logsChannelId obligatoire'),
    allowedRoleIds: z.array(z.string()).default([])
  }),
  wisp: z.object({
    panelUrl: z.string().url('wisp.panelUrl doit être une URL valide'),
    servers: z.array(serverSchema).min(1, 'Au moins un serveur WISP doit être configuré')
  }),
  dashboard: z.object({
    refreshIntervalSeconds: z.number().int().min(10).max(3600).default(60),
    accentColor: z.string().default('#5865F2'),
    onlineColor: z.string().default('#57F287'),
    offlineColor: z.string().default('#ED4245'),
    warningColor: z.string().default('#FEE75C')
  }),
  features: z.object({
    power: z.boolean().default(true),
    statistics: z.boolean().default(true),
    console: z.boolean().default(true),
    files: z.boolean().optional().default(false),
    backups: z.boolean().default(true),
    auditLogs: z.boolean().default(true),
    multiServer: z.boolean().default(true)
  })
});

class ConfigLoader {
  constructor(customConfigPath = null, customEnv = null) {
    this.customConfigPath = customConfigPath;
    this.customEnv = customEnv;
    this.env = null;
    this.privateConfig = null;
    this.ownerIds = [];
    this.allowedRoleIds = [];
    this.initialized = false;
  }

  load() {
    const rawEnv = this.customEnv || process.env;
    const parsedEnv = envSchema.safeParse(rawEnv);
    if (!parsedEnv.success) {
      const messages = parsedEnv.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Configuration d'environnement (.env) invalide: ${messages}`);
    }
    this.env = parsedEnv.data;

    this.ownerIds = this.env.DISCORD_OWNER_IDS.split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (this.ownerIds.length === 0) {
      throw new Error('DISCORD_OWNER_IDS doit contenir au moins un identifiant Discord valide');
    }

    const configPath = this.customConfigPath || path.resolve(process.cwd(), 'config', 'private.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Fichier de configuration introuvable à l'emplacement: ${configPath}. Veuillez copier config/private.example.json vers config/private.json`);
    }

    let fileContent;
    try {
      fileContent = fs.readFileSync(configPath, 'utf-8');
    } catch (readError) {
      throw new Error(`Impossible de lire le fichier ${configPath}: ${readError.message}`);
    }

    let rawJson;
    try {
      rawJson = JSON.parse(fileContent);
    } catch (jsonError) {
      throw new Error(`Le fichier ${configPath} ne contient pas de JSON valide: ${jsonError.message}`);
    }

    const parsedConfig = privateConfigSchema.safeParse(rawJson);
    if (!parsedConfig.success) {
      const messages = parsedConfig.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Configuration de private.json invalide: ${messages}`);
    }

    this.privateConfig = parsedConfig.data;
    this.allowedRoleIds = this.privateConfig.discord.allowedRoleIds.map((r) => r.trim()).filter((r) => r.length > 0);
    this.initialized = true;

    return this;
  }

  ensureInitialized() {
    if (!this.initialized) {
      this.load();
    }
  }

  getEnv() {
    this.ensureInitialized();
    return this.env;
  }

  getConfig() {
    this.ensureInitialized();
    return this.privateConfig;
  }

  getOwnerIds() {
    this.ensureInitialized();
    return this.ownerIds;
  }

  getAllowedRoleIds() {
    this.ensureInitialized();
    return this.allowedRoleIds;
  }

  getEnabledServers() {
    this.ensureInitialized();
    return this.privateConfig.wisp.servers.filter((s) => s.enabled);
  }

  getServerById(serverId) {
    this.ensureInitialized();
    if (!serverId) return null;
    return this.privateConfig.wisp.servers.find((s) => s.id === serverId && s.enabled) || null;
  }

  getDefaultServer() {
    const servers = this.getEnabledServers();
    return servers.length > 0 ? servers[0] : null;
  }

  getPanelUrl() {
    this.ensureInitialized();
    const raw = this.privateConfig.wisp.panelUrl.trim();
    return raw
      .replace(/\/+$/, '')
      .replace(/\/api\/client$/, '')
      .replace(/\/server\/[a-zA-Z0-9_-]+$/, '');
  }

  getWispApiToken() {
    this.ensureInitialized();
    return this.env.WISP_API_TOKEN;
  }

  getSafeSummary() {
    this.ensureInitialized();
    return {
      botName: this.privateConfig.bot.name,
      guildId: this.env.DISCORD_GUILD_ID,
      dashboardChannelId: this.privateConfig.discord.dashboardChannelId,
      logsChannelId: this.privateConfig.discord.logsChannelId,
      ownerCount: this.ownerIds.length,
      allowedRoleCount: this.allowedRoleIds.length,
      serverCount: this.getEnabledServers().length,
      panelUrl: this.getPanelUrl()
    };
  }
}

const configLoader = new ConfigLoader();

module.exports = {
  ConfigLoader,
  configLoader
};
