const WebSocket = require('ws');
const { wispClient } = require('./client');
const logger = require('../../utils/logger');

class WispWebSocketService {
  constructor(client = wispClient) {
    this.client = client;
    this.connections = new Map();
    this.logBuffers = new Map();
    this.maxBufferSize = 100;
  }

  getBuffer(serverId) {
    if (!this.logBuffers.has(serverId)) {
      this.logBuffers.set(serverId, []);
    }
    return this.logBuffers.get(serverId);
  }

  appendLog(serverId, line) {
    if (!line || typeof line !== 'string') return;
    const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
    if (!cleanLine) return;
    const buffer = this.getBuffer(serverId);
    buffer.push(cleanLine);
    if (buffer.length > this.maxBufferSize) {
      buffer.shift();
    }
  }

  getRecentLogs(serverId, maxLines = 15) {
    const buffer = this.getBuffer(serverId);
    if (buffer.length === 0) {
      return ['Aucune sortie récente capturée via WebSocket ou flux non connecté.'];
    }
    return buffer.slice(-maxLines);
  }

  async getWebSocketCredentials(serverId) {
    const response = await this.client.get(`/servers/${serverId}/ws`);
    const data = response.data && response.data.data ? response.data.data : response.data;
    return {
      token: data.token,
      socket: data.socket
    };
  }

  async connect(serverId) {
    if (this.connections.has(serverId)) {
      const active = this.connections.get(serverId);
      if (active.ws && active.ws.readyState === WebSocket.OPEN) {
        return;
      }
    }

    try {
      const { token, socket } = await this.getWebSocketCredentials(serverId);
      if (!socket || !token) {
        return;
      }

      const ws = new WebSocket(socket, {
        headers: {
          Origin: this.client.loader ? this.client.loader.getPanelUrl() : undefined
        }
      });

      const connectionState = {
        ws,
        serverId,
        token,
        socket,
        retryCount: 0,
        reconnectTimer: null
      };

      ws.on('open', () => {
        connectionState.retryCount = 0;
        ws.send(JSON.stringify({ event: 'auth', args: [token] }));
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.event === 'console output' && Array.isArray(parsed.args)) {
            for (const item of parsed.args) {
              this.appendLog(serverId, item);
            }
          } else if (parsed.event === 'status' && Array.isArray(parsed.args)) {
            this.appendLog(serverId, `[Statut] Serveur: ${parsed.args[0]}`);
          }
        } catch {
          this.appendLog(serverId, data.toString());
        }
      });

      ws.on('error', (err) => {
        logger.debug({ serverId, error: err.message }, 'WebSocket Wisp error');
      });

      ws.on('close', () => {
        if (connectionState.retryCount < 5) {
          const delay = Math.min(30000, 1000 * Math.pow(2, connectionState.retryCount));
          connectionState.retryCount++;
          connectionState.reconnectTimer = setTimeout(() => {
            this.connect(serverId).catch(() => {});
          }, delay);
        }
      });

      this.connections.set(serverId, connectionState);
    } catch (err) {
      logger.debug({ serverId, error: err.message }, 'Failed to initiate WebSocket connection');
    }
  }

  disconnect(serverId) {
    const conn = this.connections.get(serverId);
    if (conn) {
      if (conn.reconnectTimer) {
        clearTimeout(conn.reconnectTimer);
      }
      if (conn.ws) {
        conn.ws.removeAllListeners();
        conn.ws.terminate();
      }
      this.connections.delete(serverId);
    }
  }

  disconnectAll() {
    for (const serverId of this.connections.keys()) {
      this.disconnect(serverId);
    }
    this.logBuffers.clear();
  }
}

const wispWebSocketService = new WispWebSocketService();

module.exports = {
  WispWebSocketService,
  wispWebSocketService
};
