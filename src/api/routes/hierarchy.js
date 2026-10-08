const express = require('express');
const { buildHierarchyTree } = require('../../index/hierarchyTree');

function createHierarchyRouter(meterIndex) {
  const router = express.Router();

  /**
   * GET /api/v1/hierarchy
   * Reconstructed 7-tier distribution network hierarchy tree with meter counts,
   * status breakdowns, and data quality flags.
   */
  router.get('/', (req, res) => {
    const hierarchy = buildHierarchyTree(meterIndex.meters);
    res.json(hierarchy);
  });

  return router;
}

module.exports = { createHierarchyRouter };
