const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./api/middleware/errorHandler');
const { createMetersRouter } = require('./api/routes/meters');
const { createHierarchyRouter } = require('./api/routes/hierarchy');
const { createStatsRouter } = require('./api/routes/stats');
const { createHealthRouter } = require('./api/routes/health');
const { createAdminRouter } = require('./api/routes/admin');
const { setupOpenApiDocs } = require('./api/openapi');

function createApp({ syncManager, portalLive, portalAuth }) {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount OpenAPI / Swagger UI
  setupOpenApiDocs(app);

  // Mount API v1 routes
  const meterIndex = syncManager.index;
  app.use('/api/v1/meters', createMetersRouter(meterIndex, portalLive));
  app.use('/api/v1/hierarchy', createHierarchyRouter(meterIndex));
  app.use('/api/v1/stats', createStatsRouter(meterIndex));
  app.use('/api/v1/health', createHealthRouter(portalAuth, syncManager));
  app.use('/api/v1/index', createAdminRouter(syncManager));

  // Serve static client production build if available
  const path = require('path');
  const fs = require('fs');
  const clientDistPath = path.resolve(__dirname, '../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
  }

  // Root landing endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Urja Meter Ops REST API Wrapper',
      version: '1.0.0',
      documentation: '/docs',
      openapi: '/openapi.json',
      health: '/api/v1/health',
      endpoints: [
        '/api/v1/meters',
        '/api/v1/meters/{id}',
        '/api/v1/meters/{id}/consumption',
        '/api/v1/meters/near?lat=&lng=&radiusKm=',
        '/api/v1/hierarchy',
        '/api/v1/stats',
        '/api/v1/health',
        '/api/v1/index/refresh'
      ]
    });
  });

  // Global 404 handler for undefined routes
  app.use((req, res, next) => {
    const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    err.status = 404;
    err.code = 'ROUTE_NOT_FOUND';
    next(err);
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
