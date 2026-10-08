import { describe, it, expect } from 'vitest';
import { normalizeMeterDetail, normalizeMeterRecord } from '../src/normalize/nameplate';
import { parseIndianDateToISO, normalizeEnergyReadings } from '../src/normalize/energy';

describe('Nameplate Normalizer', () => {
  it('normalizes legacy parameterName/parameterValue array', () => {
    const raw = {
      meterId: 'J100000',
      detail: {
        data: [
          { parameterName: 'Meter ID', parameterValue: 'J100000' },
          { parameterName: 'Serial No', parameterValue: 'SE33962' },
          { parameterName: 'Make', parameterValue: 'HPL' },
          { parameterName: 'Phase Type', parameterValue: 'single' },
          { parameterName: 'Installation Status', parameterValue: 'Decommissioned' },
          { parameterName: 'Installation Type', parameterValue: 'Whole Current' }
        ]
      }
    };
    const normalized = normalizeMeterDetail(raw);
    expect(normalized).toEqual({
      meterId: 'J100000',
      serialNo: 'SE33962',
      make: 'HPL',
      phaseType: 'single',
      installStatus: 'Decommissioned',
      installType: 'Whole Current',
      build: 'legacy'
    });
  });

  it('normalizes v2 classData JSON string blob', () => {
    const raw = {
      meterId: 'J100004',
      detail: {
        classData: JSON.stringify({
          installed_meter: {
            MeterId: 'J100004',
            SerialNo: 'SE65293',
            Make: 'Genus',
            PhaseType: 'single',
            InstallationStatus: 'Faulty',
            InstallationType: 'CT Operated'
          }
        })
      }
    };
    const normalized = normalizeMeterDetail(raw);
    expect(normalized).toEqual({
      meterId: 'J100004',
      serialNo: 'SE65293',
      make: 'Genus',
      phaseType: 'single',
      installStatus: 'Faulty',
      installType: 'CT Operated',
      build: 'v2'
    });
  });

  it('normalizes export record with coordinates', () => {
    const exportRecord = {
      meterId: 'J100000',
      serialNo: 'SE33962',
      make: 'HPL',
      phaseType: 'single',
      installStatus: 'Decommissioned',
      installType: 'Whole Current',
      build: 'legacy',
      dtCode: 'DT-001',
      geo: { lat: 26.9389, lng: 75.8309 }
    };
    const normalized = normalizeMeterRecord(exportRecord);
    expect(normalized.meterId).toBe('J100000');
    expect(normalized.geo.lat).toBe(26.9389);
    expect(normalized.geo.lng).toBe(75.8309);
  });
});

describe('Energy Normalizer', () => {
  it('parses Indian DD/MM/YYYY HH:mm format to ISO 8601 with +05:30 offset', () => {
    const iso = parseIndianDateToISO('23/06/2026 23:30');
    expect(iso).toBe('2026-06-23T23:30:00+05:30');
  });

  it('computes interval consumption deltas and detects rollbacks', () => {
    const rawReadings = [
      { timestamp: '23/06/2026 23:30', kwh: '100.00', kvah: '110.00', voltR: '230' },
      { timestamp: '24/06/2026 00:00', kwh: '100.50', kvah: '110.55', voltR: '232' },
      { timestamp: '24/06/2026 00:30', kwh: '99.00', kvah: '109.00', voltR: '230' } // rollback!
    ];

    const result = normalizeEnergyReadings(rawReadings);
    expect(result.readings.length).toBe(3);
    expect(result.readings[0].deltaKwh).toBe(0);
    expect(result.readings[1].deltaKwh).toBe(0.5);
    expect(result.readings[2].deltaKwh).toBe(-1.5);

    // Rollback anomaly detected on index 2
    expect(result.anomalies.length).toBe(1);
    expect(result.anomalies[0].index).toBe(2);
    expect(result.anomalies[0].anomalies[0].type).toBe('REGISTER_ROLLBACK');
  });

  it('detects voltage out of range anomalies', () => {
    const rawReadings = [
      { timestamp: '23/06/2026 23:30', kwh: '100.00', kvah: '110.00', voltR: '170' } // low voltage!
    ];
    const result = normalizeEnergyReadings(rawReadings);
    expect(result.anomalies.length).toBe(1);
    expect(result.anomalies[0].anomalies[0].type).toBe('VOLTAGE_OUT_OF_RANGE');
  });
});
