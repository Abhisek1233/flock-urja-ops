/**
 * Parses a "DD/MM/YYYY HH:mm" string into an ISO 8601 string with Indian Standard Time (+05:30).
 * @param {string} tsStr
 * @returns {string} ISO 8601 timestamp
 */
function parseIndianDateToISO(tsStr) {
  if (!tsStr) return null;
  const parts = tsStr.trim().split(/[\s/:]+/);
  if (parts.length < 5) return null;

  const [day, month, year, hour, minute] = parts;
  const pad = (n) => String(n).padStart(2, '0');

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+05:30`;
}

/**
 * Normalizes raw energy records from the portal into structured interval readings with deltas.
 * @param {Array<{timestamp: string, kwh: string, kvah: string, voltR: string}>} rawReadings
 * @returns {{ readings: Array<object>, summary: object, anomalies: Array<object> }}
 */
function normalizeEnergyReadings(rawReadings) {
  if (!Array.isArray(rawReadings) || rawReadings.length === 0) {
    return {
      readings: [],
      summary: {
        totalReadings: 0,
        totalKwhDelta: 0,
        avgIntervalKwh: 0,
        peakIntervalKwh: 0,
        avgVoltage: 0,
        minVoltage: null,
        maxVoltage: null
      },
      anomalies: []
    };
  }

  const readings = [];
  const anomalies = [];
  let prevKwh = null;
  let prevKvah = null;
  let prevIsoDate = null;
  let sumDeltaKwh = 0;
  let peakDeltaKwh = 0;
  let sumVoltage = 0;
  let validVoltageCount = 0;
  let minVoltage = Infinity;
  let maxVoltage = -Infinity;

  for (let i = 0; i < rawReadings.length; i++) {
    const raw = rawReadings[i];
    const isoTimestamp = parseIndianDateToISO(raw.timestamp);
    const kwh = raw.kwh !== null && raw.kwh !== undefined ? parseFloat(raw.kwh) : null;
    const kvah = raw.kvah !== null && raw.kvah !== undefined ? parseFloat(raw.kvah) : null;
    const voltR = raw.voltR !== null && raw.voltR !== undefined ? parseFloat(raw.voltR) : null;

    let deltaKwh = 0;
    let deltaKvah = 0;
    const readingAnomalies = [];

    if (prevKwh !== null && kwh !== null) {
      deltaKwh = Math.round((kwh - prevKwh) * 100) / 100;
      if (deltaKwh < 0) {
        readingAnomalies.push({ type: 'REGISTER_ROLLBACK', message: `Negative delta kWh (${deltaKwh}) detected` });
      } else if (deltaKwh > 50) {
        readingAnomalies.push({ type: 'CONSUMPTION_SPIKE', message: `Unusually high delta kWh (${deltaKwh})` });
      }
      sumDeltaKwh += Math.max(0, deltaKwh);
      if (deltaKwh > peakDeltaKwh) peakDeltaKwh = deltaKwh;
    }

    if (prevKvah !== null && kvah !== null) {
      deltaKvah = Math.round((kvah - prevKvah) * 100) / 100;
    }

    // Check voltage range (standard 230V nominal: normal range 200V - 260V)
    if (voltR !== null && !isNaN(voltR)) {
      sumVoltage += voltR;
      validVoltageCount++;
      if (voltR < minVoltage) minVoltage = voltR;
      if (voltR > maxVoltage) maxVoltage = voltR;

      if (voltR < 190 || voltR > 260) {
        readingAnomalies.push({ type: 'VOLTAGE_OUT_OF_RANGE', message: `Line voltage ${voltR}V deviates from nominal 230V` });
      }
    }

    // Check for gap in 30-min intervals
    if (prevIsoDate && isoTimestamp) {
      const diffMs = new Date(isoTimestamp).getTime() - new Date(prevIsoDate).getTime();
      const diffMinutes = diffMs / (1000 * 60);
      if (diffMinutes > 35) {
        readingAnomalies.push({ type: 'DATA_GAP', message: `Interval gap of ${diffMinutes} minutes detected` });
      }
    }

    if (readingAnomalies.length > 0) {
      anomalies.push({
        index: i,
        timestamp: isoTimestamp,
        anomalies: readingAnomalies
      });
    }

    readings.push({
      timestamp: isoTimestamp,
      rawTimestamp: raw.timestamp,
      kwh,
      kvah,
      voltR,
      deltaKwh: i === 0 ? 0 : deltaKwh,
      deltaKvah: i === 0 ? 0 : deltaKvah,
      anomalies: readingAnomalies
    });

    if (kwh !== null) prevKwh = kwh;
    if (kvah !== null) prevKvah = kvah;
    if (isoTimestamp) prevIsoDate = isoTimestamp;
  }

  const avgIntervalKwh = readings.length > 1 ? Math.round((sumDeltaKwh / (readings.length - 1)) * 100) / 100 : 0;
  const avgVoltage = validVoltageCount > 0 ? Math.round((sumVoltage / validVoltageCount) * 10) / 10 : 0;

  return {
    readings,
    summary: {
      totalReadings: readings.length,
      totalKwhDelta: Math.round(sumDeltaKwh * 100) / 100,
      avgIntervalKwh,
      peakIntervalKwh: peakDeltaKwh,
      avgVoltage,
      minVoltage: minVoltage === Infinity ? null : minVoltage,
      maxVoltage: maxVoltage === -Infinity ? null : maxVoltage
    },
    anomalies
  };
}

module.exports = {
  parseIndianDateToISO,
  normalizeEnergyReadings
};
