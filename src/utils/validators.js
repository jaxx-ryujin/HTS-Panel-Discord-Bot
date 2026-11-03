const path = require('node:path');

const BLOCKED_FILE_PATTERNS = [
  /^\.env(\..+)?$/i,
  /^id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
  /\.cert$/i,
  /\.crt$/i,
  /credentials\.json$/i,
  /private\.json$/i,
  /wp-config\.php$/i,
  /\.htpasswd$/i,
  /\.shadow$/i
];

function sanitizePath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return '/';
  }
  const decoded = decodeURIComponent(rawPath);
  if (decoded.includes('..') || decoded.includes('\0')) {
    throw new Error('Chemin de fichier invalide ou tentative de traversée de répertoire');
  }
  const normalized = path.posix.normalize(decoded.replace(/\\/g, '/'));
  if (!normalized.startsWith('/')) {
    return `/${normalized}`;
  }
  return normalized;
}

function isSensitiveFile(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return true;
  }
  const clean = filePath.replace(/\\/g, '/').toLowerCase();
  const baseName = path.posix.basename(clean);
  return BLOCKED_FILE_PATTERNS.some((pattern) => pattern.test(baseName) || pattern.test(clean));
}

function sanitizeConsoleCommand(rawCommand) {
  if (typeof rawCommand !== 'string') {
    return '';
  }
  return rawCommand.trim();
}

function truncateString(str, maxLength = 100, suffix = '...') {
  if (!str || typeof str !== 'string') {
    return '';
  }
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - suffix.length) + suffix;
}

module.exports = {
  sanitizePath,
  isSensitiveFile,
  sanitizeConsoleCommand,
  truncateString
};
