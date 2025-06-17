const Router = require('koa-router');
const router = new Router();

// Import auth modules from unified export
const { login, register, profile, refresh } = require('../modules/auth');

// Import middleware
const { authMiddleware } = require('../middleware/auth');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('AuthRoutes');

// 登录路由 - 不需要认证
router.post('/api/v1/auth/login', async (ctx, next) => {
  logger.info('用户尝试登录');
  await login(ctx, next);
});

// 注册路由 - 不需要认证
router.post('/api/v1/auth/register', async (ctx, next) => {
  logger.info('用户尝试注册');
  await register(ctx, next);
});

// 用户档案路由 - 需要认证
// 注意：虽然主应用已经有了访问控制，但这里明确添加authMiddleware确保认证状态
router.get('/api/v1/auth/profile', authMiddleware, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 查看个人档案`);
  await profile(ctx, next);
});

// 令牌刷新路由 - 不需要认证（但需要有效的刷新令牌）
router.post('/api/v1/auth/refresh', async (ctx, next) => {
  logger.info('用户尝试刷新令牌');
  await refresh(ctx, next);
});

// 登出路由 - 需要认证
router.post('/api/v1/auth/logout', authMiddleware, async (ctx) => {
  const user = ctx.state.user;
  logger.info(`用户 ${user.id}(${user.role}) 退出登录`);
  
  // 记录业务日志
  const { logBusinessOperation, BusinessOperation } = require('../middleware/logger');
  logBusinessOperation(BusinessOperation.USER_LOGOUT, { 
    userId: user.id,
    username: user.username,
    role: user.role 
  }, user);
  
  ctx.body = {
    status: 'success',
    message: '退出登录成功',
    timestamp: new Date().toISOString()
  };
});

// 验证令牌状态路由 - 需要认证
router.get('/api/v1/auth/verify', authMiddleware, async (ctx) => {
  const user = ctx.state.user;
  
  ctx.body = {
    status: 'success',
    message: '令牌验证成功',
    data: {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        fullName: user.fullName
      },
      tokenValid: true
    },
    timestamp: new Date().toISOString()
  };
});

module.exports = router;
