const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

function setupOpenApiDocs(app) {
  const specPath = path.resolve(__dirname, '../../openapi.json');
  let openApiSpec = {};

  try {
    const raw = fs.readFileSync(specPath, 'utf8');
    openApiSpec = JSON.parse(raw);
  } catch (err) {
    console.error('[OpenAPI] Failed to load openapi.json:', err.message);
  }

  // Serve openapi.json directly
  app.get('/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });

  // Serve interactive Swagger UI documentation at /docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Urja Meter Ops API Docs'
  }));

  console.log('[OpenAPI] Documentation mounted at /docs and spec at /openapi.json');
}

module.exports = { setupOpenApiDocs };
