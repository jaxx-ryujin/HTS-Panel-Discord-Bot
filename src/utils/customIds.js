const PREFIX = 'wisp';

function buildCustomId(module, action, serverId = '', extra = '') {
  return [PREFIX, module, action, serverId, extra].filter((part) => part !== '').join(':');
}

function parseCustomId(customId) {
  if (!customId || typeof customId !== 'string') {
    return null;
  }
  const parts = customId.split(':');
  if (parts[0] !== PREFIX) {
    return null;
  }
  return {
    prefix: parts[0],
    module: parts[1] || '',
    action: parts[2] || '',
    serverId: parts[3] || '',
    extra: parts.slice(4).join(':') || ''
  };
}

module.exports = {
  PREFIX,
  buildCustomId,
  parseCustomId
};
