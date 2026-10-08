const config = require('../config');
const { MeterIndex } = require('./meterIndex');
const { PortalExport } = require('../portal/export');
const { SingleFlight } = require('../portal/singleFlight');

class SyncManager {
  constructor(portalClient) {
    this.index = new MeterIndex();
    this.exporter = new PortalExport(portalClient);
    this.singleFlight = new SingleFlight();
    this.status = 'uninitialized'; // 'uninitialized' | 'syncing' | 'ready' | 'error'
    this.lastError = null;
    this.timer = null;
  }

  /**
   * Refreshes the in-memory index from the bulk export.
   * Single-flight protected: concurrent calls share the ongoing refresh.
   */
  async refresh() {
    return this.singleFlight.do('index_refresh', async () => {
      this.status = 'syncing';
      try {
        const result = await this.exporter.exportAllMeters();
        this.index.load(result.data, result.source);
        this.status = 'ready';
        this.lastError = null;
        console.log(`[SyncManager] Successfully loaded ${this.index.meters.length} meters into index (Source: ${result.source})`);
        return {
          success: true,
          count: this.index.meters.length,
          source: result.source,
          lastRefreshedAt: this.index.lastUpdatedAt
        };
      } catch (err) {
        this.status = this.index.meters.length > 0 ? 'ready' : 'error';
        this.lastError = err.message;
        console.error(`[SyncManager] Refresh failed: ${err.message}`);
        throw err;
      }
    });
  }

  /**
   * Initializes index on application boot and schedules background refresh.
   */
  async start() {
    try {
      await this.refresh();
    } catch (err) {
      console.warn(`[SyncManager] Initial live sync failed, will retry: ${err.message}`);
    }

    // Schedule background refresh every CACHE_TTL_MINUTES
    const intervalMs = config.cacheTtlMinutes * 60 * 1000;
    this.timer = setInterval(() => {
      this.refresh().catch(err => {
        console.error(`[SyncManager] Background refresh error: ${err.message}`);
      });
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getHealth() {
    return {
      status: this.status,
      meterCount: this.index.meters.length,
      lastRefreshedAt: this.index.lastUpdatedAt,
      source: this.index.source,
      ttlMinutes: config.cacheTtlMinutes,
      lastError: this.lastError
    };
  }
}

module.exports = { SyncManager };
