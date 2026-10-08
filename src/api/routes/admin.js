const express = require('express');

function createAdminRouter(syncManager) {
  const router = express.Router();

  /**
   * POST /api/v1/index/refresh
   * Manually trigger re-sync of the in-memory meter index from the legacy portal.
   */
  router.post('/refresh', async (req, res, next) => {
    try {
      const result = await syncManager.refresh();
      res.json({
        message: 'Index refresh completed successfully',
        ...result
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createAdminRouter };
