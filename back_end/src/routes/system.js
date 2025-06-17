const Router = require('koa-router');
const router = new Router();

// Import system modules
const { 
  healthCheck,
  getOpenApiSpec,
  getSwaggerUI,
  generateOpenApiSpec,
  createStaticMiddleware
} = require('../modules/system');

// Import middleware for logging
const { createLogger } = require('../middleware/logger');

const logger = createLogger('SystemRoutes');

// Health check route (按API文档路径) - 公共接口，不需要认证
router.get('/api/v1/healthz', async (ctx, next) => {
  logger.info('系统健康检查');
  await healthCheck(ctx, next);
});

// API documentation routes - 公共接口，不需要认证
router.get('/api/v1/openapi.json', async (ctx, next) => {
  logger.info('获取OpenAPI规范');
  await getOpenApiSpec(ctx, next);
});

router.get('/api/v1/docs', async (ctx, next) => {
  logger.info('访问Swagger UI文档');
  await getSwaggerUI(ctx, next);
});

// 生成API文档路由 - 通常在开发环境使用，不需要认证
router.post('/api/v1/docs/generate', async (ctx, next) => {
  logger.info('生成API文档');
  await generateOpenApiSpec(ctx, next);
});

// Static file serving route - commented out as it should be handled at app level
// router.get('/api/v1/static/:path(.*)', createStaticMiddleware);

// Note: Static middleware is typically applied at the app level, not as a route
// It would be applied in the main app.js file like:
// app.use(createStaticMiddleware());// The static middleware export below c an be used in app.js

module.exports = {
  router,
  // Export middleware for use in main app
  staticMiddleware: createStaticMiddleware
};
