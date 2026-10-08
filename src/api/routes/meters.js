const express = require('express');
const { z } = require('zod');
const { validateQuery, validateParams } = require('../middleware/validator');
const { findMetersNear } = require('../../index/geo');
const { normalizeEnergyReadings } = require('../../normalize/energy');
const { normalizeMeterDetail } = require('../../normalize/nameplate');

function createMetersRouter(meterIndex, portalLive) {
  const router = express.Router();

  const listQuerySchema = z.object({
    q: z.string().optional(),
    status: z.string().optional(),
    make: z.string().optional(),
    phase: z.enum(['single', 'three']).optional(),
    installType: z.string().optional(),
    build: z.enum(['legacy', 'v2']).optional(),
    dt: z.string().optional(),
    zone: z.string().optional(),
    circle: z.string().optional(),
    division: z.string().optional(),
    substation: z.string().optional(),
    feeder: z.string().optional(),
    sort: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
  });

  const nearQuerySchema = z.object({
    lat: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    lng: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
    radiusKm: z.coerce.number().positive().max(100, 'Radius must be between 0 and 100 km').optional().default(5),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50)
  });

  const meterIdParamSchema = z.object({
    id: z.string().min(1, 'Meter ID is required')
  });

  const consumptionQuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    interval: z.string().optional().default('30m')
  });

  /**
   * GET /api/v1/meters/near
   * Spatial proximity query: finds meters within radiusKm of lat/lng.
   */
  router.get('/near', validateQuery(nearQuerySchema), (req, res) => {
    const { lat, lng, radiusKm, limit } = req.validatedQuery;
    const matches = findMetersNear(meterIndex.meters, lat, lng, radiusKm, limit);
    res.json({
      center: { lat, lng },
      radiusKm,
      total: matches.length,
      data: matches
    });
  });

  /**
   * GET /api/v1/meters
   * List, search, filter, and paginate smart meters from the in-memory index.
   */
  router.get('/', validateQuery(listQuerySchema), (req, res) => {
    const result = meterIndex.query(req.validatedQuery);
    res.json(result);
  });

  /**
   * GET /api/v1/meters/:id/consumption
   * Half-hourly energy consumption readings with interval deltas and anomaly detection.
   */
  router.get('/:id/consumption', validateParams(meterIdParamSchema), validateQuery(consumptionQuerySchema), async (req, res, next) => {
    const { id } = req.validatedParams;
    const { from, to } = req.validatedQuery;

    // Verify meter exists in index
    const indexedMeter = meterIndex.getById(id);
    if (!indexedMeter) {
      const err = new Error(`Meter ${id} not found in system index`);
      err.status = 404;
      err.code = 'METER_NOT_FOUND';
      return next(err);
    }

    try {
      const rawReadings = await portalLive.getMeterEnergy(id, { from, to });
      const normalized = normalizeEnergyReadings(rawReadings);

      res.json({
        meterId: id,
        serialNo: indexedMeter.serialNo,
        queryWindow: { from: from || null, to: to || null },
        summary: normalized.summary,
        anomalies: normalized.anomalies,
        data: normalized.readings
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/v1/meters/:id
   * Complete meter details including nameplate, coordinates, and full network hierarchy.
   */
  router.get('/:id', validateParams(meterIdParamSchema), async (req, res, next) => {
    const { id } = req.validatedParams;
    let meter = meterIndex.getById(id);

    if (!meter) {
      // Fallback: check live portal if not present in current index
      try {
        const liveDetail = await portalLive.getMeterDetailRaw(id);
        const normalizedDetail = normalizeMeterDetail(liveDetail);
        const geo = await portalLive.getMeterGeo(id);
        meter = {
          ...normalizedDetail,
          geo: {
            lat: geo?.latitude ? parseFloat(geo.latitude) : null,
            lng: geo?.longitude ? parseFloat(geo.longitude) : null
          }
        };
      } catch (err) {
        if (err.status === 404) {
          const notFound = new Error(`Meter ${id} does not exist`);
          notFound.status = 404;
          notFound.code = 'METER_NOT_FOUND';
          return next(notFound);
        }
        return next(err);
      }
    }

    res.json(meter);
  });

  return router;
}

module.exports = { createMetersRouter };
