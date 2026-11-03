function formatBytes(bytes, decimals = 2) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) {
    return '0 B';
  }
  const numericBytes = Number(bytes);
  if (numericBytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(numericBytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);
  const value = parseFloat((numericBytes / Math.pow(k, safeIndex)).toFixed(dm));
  return `${value} ${sizes[safeIndex]}`;
}

function formatCpu(cpuPercent) {
  if (cpuPercent === null || cpuPercent === undefined || isNaN(cpuPercent)) {
    return '0.0 %';
  }
  return `${Number(cpuPercent).toFixed(1)} %`;
}

function formatUptime(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) {
    return '0s';
  }
  const totalSeconds = Math.floor(Number(seconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

function formatDate(date, timezone = 'Europe/Brussels') {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) {
    return 'Date inconnue';
  }
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function formatTime(date, timezone = 'Europe/Brussels') {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) {
    return '--:--';
  }
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

function translateServerState(state) {
  const normalized = String(state || '').toLowerCase();
  switch (normalized) {
    case 'running':
      return {
        label: 'En ligne',
        indicator: '🟢',
        colorHex: '#57F287'
      };
    case 'offline':
      return {
        label: 'Hors ligne',
        indicator: '🔴',
        colorHex: '#ED4245'
      };
    case 'starting':
      return {
        label: 'Démarrage',
        indicator: '🟡',
        colorHex: '#FEE75C'
      };
    case 'stopping':
      return {
        label: 'Arrêt en cours',
        indicator: '🟠',
        colorHex: '#E67E22'
      };
    case 'unavailable':
      return {
        label: 'Indisponible',
        indicator: '⚪',
        colorHex: '#95A5A6'
      };
    default:
      return {
        label: 'État inconnu',
        indicator: '❓',
        colorHex: '#7F8C8D'
      };
  }
}

function parseHexColor(hexString, defaultColor = 0x5865f2) {
  if (!hexString || typeof hexString !== 'string') {
    return defaultColor;
  }
  const cleaned = hexString.replace('#', '').trim();
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? defaultColor : parsed;
}

module.exports = {
  formatBytes,
  formatCpu,
  formatUptime,
  formatDate,
  formatTime,
  translateServerState,
  parseHexColor
};
