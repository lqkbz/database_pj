const Router = require('koa-router');
const router = new Router({ prefix: '/api/system' });

// Import system modules
const { 
  healthCheck,
  getOpenApiSpec,
  getSwaggerUI,
  generateOpenApiSpec,
  createStaticMiddleware
} = require('../modules/system');

// Health check route
router.get('/health', healthCheck);

// API documentation routes
router.get('/docs/openapi.json', getOpenApiSpec);
router.get('/docs/swagger', getSwaggerUI);
router.post('/docs/generate', generateOpenApiSpec);

// Note: Static middleware is typically applied at the app level, not as a route
// It would be applied in the main app.js file like:
// app.use(createStaticMiddleware());
// But we'll include a reference here for completeness

module.exports = {
  router,
  // Export middleware for use in main app
  staticMiddleware: createStaticMiddleware
};
