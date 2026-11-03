const { configLoader } = require('../config/loader');

class PermissionService {
  constructor(loader = configLoader) {
    this.loader = loader;
  }

  isOwner(userId) {
    if (!userId) return false;
    const owners = this.loader.getOwnerIds();
    return owners.includes(String(userId));
  }

  hasAllowedRole(member) {
    if (!member) return false;
    const allowedRoles = this.loader.getAllowedRoleIds();
    if (allowedRoles.length === 0) return false;

    if (member.roles && member.roles.cache) {
      return member.roles.cache.some((role) => allowedRoles.includes(role.id));
    }
    if (Array.isArray(member.roles)) {
      return member.roles.some((roleId) => allowedRoles.includes(roleId));
    }
    return false;
  }

  isAuthorized(interactionOrMember) {
    const userId = interactionOrMember.user ? interactionOrMember.user.id : (interactionOrMember.id || interactionOrMember);
    if (this.isOwner(userId)) {
      return true;
    }
    const member = interactionOrMember.member || interactionOrMember;
    return this.hasAllowedRole(member);
  }

  validateGuild(interaction) {
    const env = this.loader.getEnv();
    const config = this.loader.getConfig();
    if (!config.bot.guildOnly) {
      return true;
    }
    return interaction.guildId === env.DISCORD_GUILD_ID;
  }

  validateServerConfig(serverId) {
    if (!serverId) return false;
    const server = this.loader.getServerById(serverId);
    return Boolean(server && server.enabled);
  }

  canViewDashboard(interactionOrMember) {
    return this.isAuthorized(interactionOrMember);
  }

  canControlPower(interactionOrMember) {
    return this.isAuthorized(interactionOrMember);
  }

  canForceKill(interactionOrMember) {
    const userId = interactionOrMember.user ? interactionOrMember.user.id : (interactionOrMember.id || interactionOrMember);
    return this.isOwner(userId);
  }

  canAccessConsole(interactionOrMember) {
    return this.isAuthorized(interactionOrMember);
  }

  canViewStats(interactionOrMember) {
    return this.isAuthorized(interactionOrMember);
  }

  canSelectServer(interactionOrMember) {
    return this.isAuthorized(interactionOrMember);
  }

  canManageBackups(interactionOrMember) {
    const userId = interactionOrMember.user ? interactionOrMember.user.id : (interactionOrMember.id || interactionOrMember);
    return this.isOwner(userId);
  }

  canViewAuditLogs(interactionOrMember) {
    const userId = interactionOrMember.user ? interactionOrMember.user.id : (interactionOrMember.id || interactionOrMember);
    return this.isOwner(userId);
  }

  canManagePermanentDashboard(interactionOrMember) {
    const userId = interactionOrMember.user ? interactionOrMember.user.id : (interactionOrMember.id || interactionOrMember);
    return this.isOwner(userId);
  }

  canAccessSetup(interactionOrMember) {
    const userId = interactionOrMember.user ? interactionOrMember.user.id : (interactionOrMember.id || interactionOrMember);
    return this.isOwner(userId);
  }
}

const permissionService = new PermissionService();

module.exports = {
  PermissionService,
  permissionService
};
