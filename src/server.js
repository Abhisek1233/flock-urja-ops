const config = require('./config');
const { PortalAuth } = require('./portal/auth');
const { PortalClient } = require('./portal/client');
const { PortalLive } = require('./portal/live');
const { SyncManager } = require('./index/sync');
const { createApp } = require('./app');

async function startServer() {
  console.log('--- Bootstrapping Urja Meter Ops API Service ---');
  console.log(`[Config] Target Portal: ${config.baseUrl}`);
  console.log(`[Config] Operator Email: ${config.email}`);
  console.log(`[Config] Port: ${config.port}`);

  const portalAuth = new PortalAuth();
  const portalClient = new PortalClient(portalAuth);
  const portalLive = new PortalLive(portalClient);
  const syncManager = new SyncManager(portalClient);

  // Initialize and start background cache sync
  console.log('[SyncManager] Starting initial index sync...');
  await syncManager.start();

  const app = createApp({ syncManager, portalLive, portalAuth });

  const server = app.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(` Urja Meter Ops API Service running on http://localhost:${config.port}`);
    console.log(` Interactive API Docs (Swagger UI): http://localhost:${config.port}/docs`);
    console.log(` OpenAPI 3.0 Specification: http://localhost:${config.port}/openapi.json`);
    console.log(` Health Check: http://localhost:${config.port}/api/v1/health`);
    console.log(`======================================================\n`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    syncManager.stop();
    server.close(() => {
      console.log('[Server] Closed remaining connections. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { app, server, syncManager };
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}

module.exports = { startServer };
