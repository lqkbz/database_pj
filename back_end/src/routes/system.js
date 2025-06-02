const Router = require('@koa/router');
const system = require('../modules/system');

// 创建路由实例
const router = new Router({
  prefix: '/api/v1'
});

// 健康检查路由
router.get('/healthz', system.healthCheck);

// API文档路由
router.get('/openapi.json', system.getOpenApiSpec);
router.get('/docs', system.getSwaggerUI);

module.exports = router; 