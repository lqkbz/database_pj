const Router = require('@koa/router');
const { authMiddleware } = require('../middleware/auth');

// 导入控制器
const register = require('../modules/auth/register');
const login = require('../modules/auth/login');
const refresh = require('../modules/auth/refresh');
const profile = require('../modules/auth/profile');

// 创建路由实例
const router = new Router({
  prefix: '/api/v1/auth'
});

// 注册路由
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/profile', authMiddleware, profile);

module.exports = router;
