const { cleanString } = require('./nameplate');

/**
 * Normalizes an individual hierarchy level.
 * Handles both object shapes { name, code } and SvelteKit strings "Name (CODE)".
 * Replaces blanks with "Unknown" and flags anomalies.
 */
function parseHierarchyNode(raw) {
  let name = '';
  let code = '';

  if (typeof raw === 'string') {
    const trimmed = cleanString(raw);
    const match = trimmed.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
    if (match) {
      name = cleanString(match[1]);
      code = cleanString(match[2]);
    } else {
      name = trimmed;
    }
  } else if (raw && typeof raw === 'object') {
    name = cleanString(raw.name);
    code = cleanString(raw.code);
  }

  const isMissingName = !name;
  const isMissingCode = !code;

  return {
    name: name || 'Unknown',
    code: code || (name ? name.replace(/\s+/g, '_').toUpperCase() : 'UNKNOWN'),
    originalName: name,
    originalCode: code,
    isMissingName,
    isMissingCode
  };
}

/**
 * Normalizes full 7-tier hierarchy and generates canonical lineage paths.
 * @param {object} raw
 * @returns {object}
 */
function normalizeHierarchy(raw) {
  if (!raw) return null;

  const rawZone = raw.zone || raw['Zone'];
  const rawCircle = raw.circle || raw['Circle'];
  const rawDivision = raw.division || raw['Division'];
  const rawSubdivision = raw.subdivision || raw['Subdivision'];
  const rawSubstation = raw.substation || raw['Sub Station'] || raw['Substation'];
  const rawFeeder = raw.feeder || raw['Feeder'];
  const rawDt = raw.dt || raw['DT'];

  const zone = parseHierarchyNode(rawZone);
  const circle = parseHierarchyNode(rawCircle);
  const division = parseHierarchyNode(rawDivision);
  const subdivision = parseHierarchyNode(rawSubdivision);
  const substation = parseHierarchyNode(rawSubstation);
  const feeder = parseHierarchyNode(rawFeeder);
  const dt = parseHierarchyNode(rawDt);

  const missingFields = [];
  if (zone.isMissingName) missingFields.push('zone.name');
  if (zone.isMissingCode) missingFields.push('zone.code');
  if (circle.isMissingName) missingFields.push('circle.name');
  if (circle.isMissingCode) missingFields.push('circle.code');
  if (division.isMissingName) missingFields.push('division.name');
  if (division.isMissingCode) missingFields.push('division.code');
  if (subdivision.isMissingName) missingFields.push('subdivision.name');
  if (subdivision.isMissingCode) missingFields.push('subdivision.code');
  if (substation.isMissingName) missingFields.push('substation.name');
  if (substation.isMissingCode) missingFields.push('substation.code');
  if (feeder.isMissingName) missingFields.push('feeder.name');
  if (feeder.isMissingCode) missingFields.push('feeder.code');
  if (dt.isMissingName) missingFields.push('dt.name');
  if (dt.isMissingCode) missingFields.push('dt.code');

  const conflictFlags = [];
  if (dt.code === 'DT-007' && dt.name.includes('Old Malviya Nagar')) {
    conflictFlags.push('DT_NAME_ALIAS_COLLISION');
  }

  // Canonical paths
  const path = [zone.name, circle.name, division.name, subdivision.name, substation.name, feeder.name, dt.name].join(' / ');
  const pathCodes = [zone.code, circle.code, division.code, subdivision.code, substation.code, feeder.code, dt.code].join(' / ');

  return {
    levels: {
      zone: { name: zone.name, code: zone.code },
      circle: { name: circle.name, code: circle.code },
      division: { name: division.name, code: division.code },
      subdivision: { name: subdivision.name, code: subdivision.code },
      substation: { name: substation.name, code: substation.code },
      feeder: { name: feeder.name, code: feeder.code },
      dt: { name: dt.name, code: dt.code }
    },
    path,
    pathCodes,
    dataQuality: {
      hasMissingHierarchy: missingFields.length > 0,
      missingFields,
      conflictFlags
    }
  };
}

module.exports = {
  parseHierarchyNode,
  normalizeHierarchy
};
