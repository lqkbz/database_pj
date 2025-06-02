const Router = require('@koa/router');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 导入控制器
// 实际项目中需要实现这些控制器
const userProfileController = require('../modules/customers/userProfile');

// 创建路由实例
const router = new Router({
  prefix: '/api/v1/users'
});

// 用户资料路由
router.get('/me', authMiddleware, requireRole('customer'), userProfileController.getMyProfile);
router.patch('/me', authMiddleware, requireRole('customer'), userProfileController.updateMyProfile);

module.exports = router;
