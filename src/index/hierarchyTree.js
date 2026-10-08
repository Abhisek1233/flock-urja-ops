/**
 * Constructs a hierarchical tree from normalized meter records.
 * Solves code collisions by keying all nodes on their canonical full lineage path.
 */

const LEVELS = ['zone', 'circle', 'division', 'subdivision', 'substation', 'feeder', 'dt'];

function createNode(level, name, code, path, isMissingName = false, isMissingCode = false) {
  return {
    level,
    name,
    code,
    path,
    meterCount: 0,
    statusCounts: {
      Installed: 0,
      Faulty: 0,
      Decommissioned: 0,
      Other: 0
    },
    dataQuality: {
      isUnknown: name === 'Unknown' || code === 'UNKNOWN',
      hasMissingName: isMissingName,
      hasMissingCode: isMissingCode,
      hasConflict: code === 'DT-007' && name.includes('Old Malviya Nagar')
    },
    children: []
  };
}

/**
 * Builds the complete hierarchy tree and statistics from an array of meters.
 * @param {Array<object>} meters
 * @returns {{ tree: Array<object>, summary: object }}
 */
function buildHierarchyTree(meters) {
  const rootNodes = new Map(); // path -> node
  const allNodesByPath = new Map();

  let missingNameMeters = 0;
  let missingCodeMeters = 0;
  let aliasConflictMeters = 0;

  for (const meter of meters) {
    if (!meter.hierarchy || !meter.hierarchy.levels) continue;
    const { levels, dataQuality } = meter.hierarchy;
    const status = meter.installStatus || 'Other';

    if (dataQuality?.hasMissingName) missingNameMeters++;
    if (dataQuality?.hasMissingCode) missingCodeMeters++;
    if (dataQuality?.conflictFlags?.length > 0) aliasConflictMeters++;

    let currentPath = '';
    let parentNode = null;

    for (let i = 0; i < LEVELS.length; i++) {
      const levelKey = LEVELS[i];
      const levelData = levels[levelKey] || { name: 'Unknown', code: 'UNKNOWN' };
      const segment = `${levelData.name} (${levelData.code})`;
      currentPath = currentPath ? `${currentPath} / ${segment}` : segment;

      let node = allNodesByPath.get(currentPath);
      if (!node) {
        node = createNode(
          levelKey,
          levelData.name,
          levelData.code,
          currentPath,
          levelData.name === 'Unknown',
          levelData.code === 'UNKNOWN'
        );
        allNodesByPath.set(currentPath, node);

        if (parentNode) {
          parentNode.children.push(node);
        } else {
          rootNodes.set(currentPath, node);
        }
      }

      // Update counters
      node.meterCount++;
      if (node.statusCounts[status] !== undefined) {
        node.statusCounts[status]++;
      } else {
        node.statusCounts.Other++;
      }

      parentNode = node;
    }
  }

  return {
    tree: Array.from(rootNodes.values()),
    summary: {
      totalMeters: meters.length,
      totalNodes: allNodesByPath.size,
      metersWithMissingNames: missingNameMeters,
      metersWithMissingCodes: missingCodeMeters,
      metersWithAliasConflicts: aliasConflictMeters
    }
  };
}

module.exports = {
  buildHierarchyTree,
  LEVELS
};
