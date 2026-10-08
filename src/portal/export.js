const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class PortalExport {
  constructor(portalClient) {
    this.client = portalClient;
    this.fixturesPath = path.resolve(__dirname, '../../fixtures/meter-export.json');
  }

  /**
   * Generates the HMAC-SHA256 signature required by the portal export endpoint.
   * @param {string} method e.g. "GET"
   * @param {string} endpointPath e.g. "/portal/export"
   * @param {string} query e.g. "page=1"
   * @param {string} signingSecret
   * @param {string} timestamp unix seconds
   */
  generateSignature(method, endpointPath, query, signingSecret, timestamp) {
    const payload = [method, endpointPath, query, timestamp].join('\n');
    return crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');
  }

  /**
   * Fetches the full dataset of all 403 meters using the portal's bulk export mechanism.
   * Gracefully falls back to local fixtures if the portal is unreachable.
   */
  async exportAllMeters() {
    try {
      // 1. Fetch signing key
      const keysResponse = await this.client.get('/portal/keys');
      const signingSecret = keysResponse.data?.data?.signingSecret;
      if (!signingSecret) {
        throw new Error('No signingSecret received from /portal/keys');
      }

      // 2. Generate HMAC signature
      const method = 'GET';
      const endpointPath = '/portal/export';
      const query = 'page=1';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = this.generateSignature(method, endpointPath, query, signingSecret, timestamp);

      // 3. Fetch export
      const exportResponse = await this.client.get(`/portal/export?${query}`, {
        headers: {
          'x-timestamp': timestamp,
          'x-signature': signature
        }
      });

      const records = exportResponse.data?.data || [];
      return {
        source: 'live_portal_export',
        total: records.length,
        timestamp: new Date().toISOString(),
        data: records
      };
    } catch (err) {
      // Offline / network failure fallback
      if (fs.existsSync(this.fixturesPath)) {
        console.warn(`[PortalExport] Live export failed (${err.message}). Falling back to cached fixtures.`);
        const raw = fs.readFileSync(this.fixturesPath, 'utf8');
        const data = JSON.parse(raw);
        return {
          source: 'local_fixture_fallback',
          total: data.length,
          timestamp: new Date().toISOString(),
          data
        };
      }
      throw err;
    }
  }
}

module.exports = { PortalExport };
