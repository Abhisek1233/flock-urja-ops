const { unflatten } = require('devalue');

class PortalLive {
  constructor(portalClient) {
    this.client = portalClient;
  }

  /**
   * Fetches and un-flattens meter details from SvelteKit's __data.json.
   * @param {string} meterId
   */
  async getMeterDetailRaw(meterId) {
    const res = await this.client.get(`/meters/${encodeURIComponent(meterId)}/__data.json`);
    const json = res.data;

    // Check if SvelteKit returned an error node
    if (json.nodes && json.nodes[2] && json.nodes[2].type === 'error') {
      const err = new Error(json.nodes[2].error?.message || 'Meter not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (!json.nodes || !json.nodes[2] || !json.nodes[2].data) {
      throw new Error(`Unexpected SvelteKit __data.json format for meter ${meterId}`);
    }

    // unflatten devalue array
    try {
      const unflattened = unflatten(json.nodes[2].data);
      return unflattened;
    } catch {
      // If devalue unflatten fails or is already an object
      return json.nodes[2].data;
    }
  }

  /**
   * Fetches meter coordinates from /portal/meters/:id/geo.
   */
  async getMeterGeo(meterId) {
    const res = await this.client.get(`/portal/meters/${encodeURIComponent(meterId)}/geo`);
    return res.data?.data || null;
  }

  /**
   * Fetches half-hourly consumption readings from /portal/meters/:id/energy.
   * @param {string} meterId
   * @param {{ from?: string, to?: string }} options
   */
  async getMeterEnergy(meterId, { from, to } = {}) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await this.client.get(`/portal/meters/${encodeURIComponent(meterId)}/energy${queryString}`);
    return res.data?.data || [];
  }

  /**
   * Queries the legacy portal search API /portal/meters/search.
   */
  async searchMeters(q = '', page = 1) {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('page', String(page));

    const res = await this.client.get(`/portal/meters/search?${params.toString()}`);
    return res.data || { data: [], total: 0, page, pageSize: 20 };
  }

  /**
   * Fetches distribution transformers from /portal/dts.
   */
  async getTransformers(page = 1) {
    const res = await this.client.get(`/portal/dts?page=${page}`);
    return res.data || { data: [], total: 0, page, pageSize: 20 };
  }
}

module.exports = { PortalLive };
