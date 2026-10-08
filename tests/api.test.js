import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app';
import { MeterIndex } from '../src/index/meterIndex';

describe('API Route Integration Tests', () => {
  let app;
  let meterIndex;

  beforeAll(() => {
    meterIndex = new MeterIndex();
    const fixturePath = path.resolve(__dirname, '../fixtures/meter-export.json');
    const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    meterIndex.load(rawData, 'fixture_test');

    const mockSyncManager = {
      index: meterIndex,
      status: 'ready',
      refresh: async () => ({ success: true, count: meterIndex.meters.length, source: 'mock' }),
      getHealth: () => ({
        status: 'ready',
        meterCount: meterIndex.meters.length,
        lastRefreshedAt: meterIndex.lastUpdatedAt,
        source: 'fixture_test',
        ttlMinutes: 15
      })
    };

    const mockPortalAuth = {
      getSessionStatus: () => ({ authenticated: true, ageSeconds: 10, expiresInSeconds: 3590 })
    };

    const mockPortalLive = {
      getMeterDetailRaw: async (id) => {
        if (id === 'J100000') return { meterId: id, detail: { data: [] } };
        const err = new Error('Meter not found');
        err.status = 404;
        throw err;
      },
      getMeterGeo: async () => ({ latitude: '26.9389', longitude: '75.8309' }),
      getMeterEnergy: async () => [
        { timestamp: '23/06/2026 23:30', kwh: '100.0', kvah: '110.0', voltR: '230' },
        { timestamp: '24/06/2026 00:00', kwh: '100.5', kvah: '110.5', voltR: '230' }
      ]
    };

    app = createApp({
      syncManager: mockSyncManager,
      portalLive: mockPortalLive,
      portalAuth: mockPortalAuth
    });
  });

  it('GET /api/v1/health returns 200 with healthy index and session status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.index.meterCount).toBe(403);
    expect(res.body.portalSession.authenticated).toBe(true);
  });

  it('GET /api/v1/stats returns 200 with dataset metrics', async () => {
    const res = await request(app).get('/api/v1/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(403);
    expect(res.body.byStatus.Installed).toBeGreaterThan(0);
    expect(res.body.byMake.HPL).toBeGreaterThan(0);
  });

  it('GET /api/v1/meters returns 200 with pagination and filters', async () => {
    const res = await request(app).get('/api/v1/meters?pageSize=10&status=Installed');
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.data.length).toBe(10);
    for (const m of res.body.data) {
      expect(m.installStatus).toBe('Installed');
    }
  });

  it('GET /api/v1/meters/:id returns 200 for existing meter', async () => {
    const res = await request(app).get('/api/v1/meters/J100000');
    expect(res.status).toBe(200);
    expect(res.body.meterId).toBe('J100000');
    expect(res.body.make).toBe('HPL');
    expect(res.body.hierarchy.levels.zone.name).toBe('Jaipur Zone 1');
  });

  it('GET /api/v1/meters/:id returns 404 for non-existent meter', async () => {
    const res = await request(app).get('/api/v1/meters/NON_EXISTENT_999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('METER_NOT_FOUND');
  });

  it('GET /api/v1/meters/near returns 200 with meters ordered by proximity', async () => {
    const res = await request(app).get('/api/v1/meters/near?lat=26.9389&lng=75.8309&radiusKm=3');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.data[0].meterId).toBe('J100000');
    expect(res.body.data[0].distanceKm).toBeCloseTo(0, 1);
  });

  it('GET /api/v1/meters/near returns 400 for invalid coordinates', async () => {
    const res = await request(app).get('/api/v1/meters/near?lat=120&lng=75.8309'); // lat > 90
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_QUERY_PARAMS');
  });

  it('GET /api/v1/hierarchy returns 200 with organized tree', async () => {
    const res = await request(app).get('/api/v1/hierarchy');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tree)).toBe(true);
    expect(res.body.summary.totalMeters).toBe(403);
  });

  it('GET /api/v1/meters/:id/consumption returns 200 with deltas and summary', async () => {
    const res = await request(app).get('/api/v1/meters/J100000/consumption');
    expect(res.status).toBe(200);
    expect(res.body.meterId).toBe('J100000');
    expect(res.body.summary.totalReadings).toBe(2);
    expect(res.body.data[1].deltaKwh).toBe(0.5);
  });

  it('GET /openapi.json serves the committed OpenAPI specification', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toContain('Urja Meter Ops');
  });

  it('POST /api/v1/index/refresh triggers re-sync', async () => {
    const res = await request(app).post('/api/v1/index/refresh');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(403);
  });
});
