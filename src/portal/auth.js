const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const config = require('../config');
const { SingleFlight } = require('./singleFlight');

class PortalAuth {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: config.baseUrl,
      withCredentials: true,
      headers: {
        'Origin': config.baseUrl,
        'User-Agent': 'UrjaOps-API-Wrapper/1.0.0'
      },
      timeout: 10000
    }));
    this.sessionCreatedAt = null;
    this.sessionMaxAge = 3600; // 1 hour in seconds
    this.singleFlight = new SingleFlight();
    this.currentUser = null;
  }

  /**
   * Check if current session is still valid or nearing expiry.
   */
  isSessionValid() {
    if (!this.sessionCreatedAt) return false;
    const elapsedSeconds = (Date.now() - this.sessionCreatedAt) / 1000;
    // Buffer: refresh 5 minutes before the 1-hour expiry
    return elapsedSeconds < (this.sessionMaxAge - config.sessionExpiryBufferSeconds);
  }

  /**
   * Perform login against the SvelteKit /login form action.
   */
  async login() {
    return this.singleFlight.do('login', async () => {
      const params = new URLSearchParams();
      params.append('email', config.email);
      params.append('password', config.password);

      const response = await this.client.post('/login', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': config.baseUrl
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });

      // SvelteKit returns 200 with JSON payload
      const body = response.data;
      if (body && body.type === 'failure') {
        const errorMsg = body.data || 'Invalid portal credentials';
        throw new Error(`Portal login failed: ${errorMsg}`);
      }

      if (body && body.type === 'redirect' && body.location) {
        this.sessionCreatedAt = Date.now();
        this.currentUser = { email: config.email };
        return { success: true, location: body.location };
      }

      // Check cookie presence
      const cookies = await this.jar.getCookies(config.baseUrl);
      const sessionCookie = cookies.find(c => c.key === '__Secure-better-auth.session_token');
      if (sessionCookie) {
        this.sessionCreatedAt = Date.now();
        return { success: true };
      }

      throw new Error(`Unexpected portal login response: ${JSON.stringify(body)}`);
    });
  }

  /**
   * Ensures that a valid session exists, logging in if needed.
   */
  async ensureSession() {
    if (!this.isSessionValid()) {
      await this.login();
    }
  }

  /**
   * Invalidate local session to force re-login on next request.
   */
  invalidateSession() {
    this.sessionCreatedAt = null;
  }

  /**
   * Health metrics regarding the session.
   */
  getSessionStatus() {
    return {
      authenticated: !!this.sessionCreatedAt,
      ageSeconds: this.sessionCreatedAt ? Math.floor((Date.now() - this.sessionCreatedAt) / 1000) : null,
      expiresInSeconds: this.sessionCreatedAt ? Math.max(0, Math.floor(this.sessionMaxAge - (Date.now() - this.sessionCreatedAt) / 1000)) : 0,
      user: this.currentUser
    };
  }
}

module.exports = { PortalAuth };
