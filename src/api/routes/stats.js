const express = require('express');

function createStatsRouter(meterIndex) {
  const router = express.Router();

  /**
   * GET /api/v1/stats
   * Aggregated system statistics across meters, manufacturers, install types, and data quality.
   */
  router.get('/', (req, res) => {
    const stats = meterIndex.getStats();
    res.json(stats);
  });

  return router;
}

module.exports = { createStatsRouter };
