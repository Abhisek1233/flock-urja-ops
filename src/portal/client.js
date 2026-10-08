const config = require('../config');
const { PortalAuth } = require('./auth');

class PortalClient {
  constructor(authInstance) {
    this.auth = authInstance || new PortalAuth();
  }

  /**
   * Execute an authenticated HTTP GET or POST request against the legacy portal.
   * Handles auto-reauthentication on 401/redirects with single-flight mutex and one retry.
   */
  async request(configOptions, retryCount = 0) {
    await this.auth.ensureSession();

    try {
      const response = await this.auth.client({
        ...configOptions,
        validateStatus: (status) => status >= 200 && status < 400
      });

      // Detect SvelteKit soft redirects to /login (e.g. __data.json returning {type:"redirect", location:"/login"})
      if (response.data && response.data.type === 'redirect' && response.data.location === '/login') {
        if (retryCount < 1) {
          this.auth.invalidateSession();
          await this.auth.login();
          return this.request(configOptions, retryCount + 1);
        }
        const error = new Error('Session expired and re-authentication failed');
        error.code = 'PORTAL_AUTH_EXPIRED';
        error.status = 401;
        throw error;
      }

      return response;
    } catch (err) {
      const status = err.response ? err.response.status : null;
      const data = err.response ? err.response.data : null;

      // Handle explicit 401 Unauthorized from /portal/* APIs
      if (status === 401 && retryCount < 1) {
        this.auth.invalidateSession();
        await this.auth.login();
        return this.request(configOptions, retryCount + 1);
      }

      // 404 Meter not found
      if (status === 404) {
        const notFoundErr = new Error(data?.message || 'Resource not found on legacy portal');
        notFoundErr.code = 'NOT_FOUND';
        notFoundErr.status = 404;
        notFoundErr.details = data;
        throw notFoundErr;
      }

      // Retry 5xx server errors once with backoff
      if (status && status >= 500 && retryCount < 2) {
        await new Promise(r => setTimeout(r, (retryCount + 1) * 500));
        return this.request(configOptions, retryCount + 1);
      }

      // Normalize network / upstream errors
      const upstreamErr = new Error(err.message || 'Legacy portal request failed');
      upstreamErr.code = status ? `PORTAL_HTTP_${status}` : 'PORTAL_NETWORK_ERROR';
      upstreamErr.status = status || 502;
      upstreamErr.details = data || null;
      throw upstreamErr;
    }
  }

  async get(url, options = {}) {
    return this.request({ method: 'GET', url, ...options });
  }

  async post(url, data, options = {}) {
    return this.request({ method: 'POST', url, data, ...options });
  }
}

module.exports = { PortalClient };
