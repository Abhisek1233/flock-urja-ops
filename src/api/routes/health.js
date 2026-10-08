const express = require('express');

function createHealthRouter(portalAuth, syncManager) {
  const router = express.Router();

  /**
   * GET /api/v1/health
   * Service health, portal session status, and index cache freshness.
   */
  router.get('/', (req, res) => {
    const session = portalAuth.getSessionStatus();
    const sync = syncManager.getHealth();

    const isHealthy = sync.status === 'ready' && sync.meterCount > 0;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      index: sync,
      portalSession: session
    });
  });

  return router;
}

module.exports = { createHealthRouter };
