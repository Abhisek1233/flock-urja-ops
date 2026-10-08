/**
 * Normalizes meter nameplate attributes from various raw formats (legacy detail list,
 * v2 classData JSON blob, or bulk export record) into a consistent schema.
 */

function cleanString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Normalizes raw detail from SvelteKit __data.json
 * @param {object} unflattenedDetailPayload
 * @returns {object}
 */
function normalizeMeterDetail(unflattenedDetailPayload) {
  if (!unflattenedDetailPayload) return {};

  const meterId = cleanString(unflattenedDetailPayload.meterId);
  const detail = unflattenedDetailPayload.detail || {};
  let attributes = {};

  if (detail.classData) {
    // V2 format: JSON string inside classData
    try {
      const parsed = typeof detail.classData === 'string' ? JSON.parse(detail.classData) : detail.classData;
      const meter = parsed.installed_meter || parsed;
      attributes = {
        meterId: cleanString(meter.MeterId || meter.meterId || meterId),
        serialNo: cleanString(meter.SerialNo || meter.serialNo),
        make: cleanString(meter.Make || meter.make),
        phaseType: cleanString(meter.PhaseType || meter.phaseType).toLowerCase(),
        installStatus: cleanString(meter.InstallationStatus || meter.installStatus),
        installType: cleanString(meter.InstallationType || meter.installType),
        build: 'v2'
      };
    } catch {
      attributes = { meterId, build: 'v2' };
    }
  } else if (Array.isArray(detail.data)) {
    // Legacy format: array of parameterName / parameterValue pairs
    const map = {};
    for (const item of detail.data) {
      if (item && item.parameterName) {
        map[cleanString(item.parameterName)] = cleanString(item.parameterValue);
      }
    }
    attributes = {
      meterId: cleanString(map['Meter ID'] || meterId),
      serialNo: cleanString(map['Serial No'] || map['Serial Number']),
      make: cleanString(map['Make']),
      phaseType: cleanString(map['Phase Type'] || map['Phase']).toLowerCase(),
      installStatus: cleanString(map['Installation Status'] || map['Status']),
      installType: cleanString(map['Installation Type']),
      build: 'legacy'
    };
  }

  return attributes;
}

/**
 * Normalizes a meter record from the bulk export or merges it with live details.
 * @param {object} rawMeter
 * @returns {object}
 */
function normalizeMeterRecord(rawMeter) {
  if (!rawMeter) return null;

  const lat = rawMeter.geo?.lat ?? rawMeter.geo?.latitude ?? null;
  const lng = rawMeter.geo?.lng ?? rawMeter.geo?.longitude ?? null;

  return {
    meterId: cleanString(rawMeter.meterId),
    serialNo: cleanString(rawMeter.serialNo),
    make: cleanString(rawMeter.make),
    phaseType: cleanString(rawMeter.phaseType).toLowerCase(),
    installStatus: cleanString(rawMeter.installStatus),
    installType: cleanString(rawMeter.installType),
    build: cleanString(rawMeter.build) || 'legacy',
    dtCode: cleanString(rawMeter.dtCode),
    geo: {
      lat: lat !== null ? parseFloat(lat) : null,
      lng: lng !== null ? parseFloat(lng) : null
    }
  };
}

module.exports = {
  normalizeMeterDetail,
  normalizeMeterRecord,
  cleanString
};
