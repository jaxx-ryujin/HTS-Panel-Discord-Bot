const axios = require('axios');
const { configLoader } = require('../../config/loader');

class WispClientError extends Error {
  constructor(message, statusCode = null, originalError = null) {
    super(message);
    this.name = 'WispClientError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

class WispApiClient {
  constructor(loader = configLoader) {
    this.loader = loader;
    this.instance = null;
  }

  getAxios() {
    if (!this.instance) {
      const panelUrl = this.loader.getPanelUrl();
      const token = this.loader.getWispApiToken();

      this.instance = axios.create({
        baseURL: `${panelUrl}/api/client`,
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.wisp.v1+json',
          'Content-Type': 'application/json'
        }
      });

      this.instance.interceptors.response.use(
        (response) => response,
        (error) => {
          const status = error.response ? error.response.status : null;
          let friendlyMessage = 'Erreur de communication avec le panel WISP.';

          if (!error.response) {
            if (error.code === 'ECONNABORTED') {
              friendlyMessage = 'Délai d\'attente dépassé lors de la requête vers le panel WISP.';
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
              friendlyMessage = 'Impossible de joindre l\'adresse du panel WISP configurée.';
            } else {
              friendlyMessage = `Erreur réseau avec le panel WISP: ${error.message}`;
            }
          } else {
            switch (status) {
              case 401:
                friendlyMessage = 'Authentification WISP invalide (clé API rejetée).';
                break;
              case 403:
                friendlyMessage = 'Permissions insuffisantes sur le panel WISP pour cette ressource.';
                break;
              case 404:
                friendlyMessage = 'Ressource ou serveur introuvable sur le panel WISP.';
                break;
              case 429:
                friendlyMessage = 'Limite de requêtes atteinte sur le panel WISP (Rate Limit). Réessayez dans un instant.';
                break;
              case 500:
              case 502:
              case 503:
              case 504:
                friendlyMessage = `Le panel WISP rencontre un problème interne (Code HTTP ${status}).`;
                break;
              default:
                if (error.response.data && error.response.data.errors && error.response.data.errors[0]) {
                  friendlyMessage = error.response.data.errors[0].detail || error.response.data.errors[0].code || friendlyMessage;
                }
                break;
            }
          }

          return Promise.reject(new WispClientError(friendlyMessage, status, error));
        }
      );
    }
    return this.instance;
  }

  async request(config) {
    const client = this.getAxios();
    return client.request(config);
  }

  async get(url, params = {}) {
    return this.request({ method: 'GET', url, params });
  }

  async post(url, data = {}, params = {}) {
    return this.request({ method: 'POST', url, data, params });
  }

  async put(url, data = {}, params = {}) {
    return this.request({ method: 'PUT', url, data, params });
  }

  async delete(url, data = {}, params = {}) {
    return this.request({ method: 'DELETE', url, data, params });
  }
}

const wispClient = new WispApiClient();

module.exports = {
  WispClientError,
  WispApiClient,
  wispClient
};
