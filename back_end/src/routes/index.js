const Router = require('koa-router');
const authRoutes = require('./auth');
// 导入其他路由模块
// const userRoutes = require('./user');
// const adminRoutes = require('./admin');

// 创建主路由实例
const router = new Router();

// 注册所有子路由
router.use(authRoutes.routes(), authRoutes.allowedMethods());
// router.use(userRoutes.routes(), userRoutes.allowedMethods());
// router.use(adminRoutes.routes(), adminRoutes.allowedMethods());

// 基本健康检查路由
router.get('/api/v1/healthz', async (ctx) => {
  ctx.body = {
    status: 'success',
    message: '服务正常运行',
    timestamp: new Date()
  };
});

module.exports = router;
