/**
 * Calculates great-circle distance between two points on the Earth's surface using Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in kilometers
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000) / 1000;
}

/**
 * Searches the meter dataset for meters located within a given radius.
 * @param {Array<object>} meters
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} radiusKm
 * @param {number} [limit=100]
 * @returns {Array<object>} list of meters sorted by distance ascending with distanceKm property
 */
function findMetersNear(meters, centerLat, centerLng, radiusKm = 5, limit = 100) {
  const matches = [];

  for (const meter of meters) {
    if (!meter.geo || meter.geo.lat === null || meter.geo.lng === null) continue;
    const dist = haversineDistanceKm(centerLat, centerLng, meter.geo.lat, meter.geo.lng);
    if (dist <= radiusKm) {
      matches.push({
        ...meter,
        distanceKm: dist
      });
    }
  }

  matches.sort((a, b) => a.distanceKm - b.distanceKm);
  return matches.slice(0, limit);
}

module.exports = {
  haversineDistanceKm,
  findMetersNear
};
