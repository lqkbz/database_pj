const Router = require('koa-router');
const router = new Router();

// Import route modules
const adminRouter = require('./admin');
const authRouter = require('./auth');
const customersRouter = require('./customers');
const mechanicRouter = require('./mechanic');
const { router: systemRouter } = require('./system');

// Import middleware for specific route groups
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 处理favicon.ico请求，避免404错误
router.get('/favicon.ico', async (ctx) => {
  // 返回204 No Content，避免404错误
  ctx.status = 204;
});

// 注册认证路由（不需要认证）
router.use(authRouter.routes(), authRouter.allowedMethods());

// 注册系统路由（不需要认证）
router.use(systemRouter.routes(), systemRouter.allowedMethods());

// 注册客户路由（需要认证，并且需要customer或admin角色）
router.use(customersRouter.routes(), customersRouter.allowedMethods());

// 注册技师路由（需要认证，并且需要mechanic或admin角色）
router.use(mechanicRouter.routes(), mechanicRouter.allowedMethods());

// 注册管理员路由（需要认证，并且只有admin角色可以访问）
router.use(adminRouter.routes(), adminRouter.allowedMethods());

// 根路由 - 系统健康检查
router.get('/', async (ctx) => {
  ctx.body = {
    status: 'success',
    message: '车辆维修管理系统 API 服务正常运行',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/v1/auth/*',
      customers: '/api/v1/users/*, /api/v1/vehicles/*, /api/v1/work-orders/*',
      mechanics: '/api/v1/mechanics/*, /api/v1/work-orders/*',
      admin: '/api/v1/admin/*',
      system: '/api/v1/healthz, /api/v1/docs, /api/v1/openapi.json'
    }
  };
});

// API版本信息路由
router.get('/api', async (ctx) => {
  ctx.body = {
    status: 'success',
    message: '车辆维修管理系统 API',
    version: 'v1',
    description: '支持客户、技师和管理员三种角色的车辆维修业务管理',
    documentation: '/api/v1/docs',
    openapi: '/api/v1/openapi.json'
  };
});

// API v1 版本信息路由
router.get('/api/v1', async (ctx) => {
  ctx.body = {
    status: 'success',
    message: '车辆维修管理系统 API v1',
    features: [
      '用户认证与授权',
      '基于角色的访问控制',
      '车辆信息管理',
      '维修工单管理',
      '技师工作管理',
      '库存与配件管理',
      '财务与支付管理',
      '统计报表功能'
    ],
    roles: [
      { role: 'customer', description: '客户 - 管理车辆和工单，提交维修申请' },
      { role: 'mechanic', description: '技师 - 处理维修工单，记录工作进度' },
      { role: 'admin', description: '管理员 - 系统管理和监控' }
    ]
  };
});

module.exports = router;
