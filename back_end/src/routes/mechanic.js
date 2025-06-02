const Router = require('@koa/router');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 导入技师控制器
const mechanicProfile = require('../modules/mechanic/mechanicProfile');
const mechanicWorkOrders = require('../modules/mechanic/mechanicWorkOrders');
const mechanicIncome = require('../modules/mechanic/mechanicIncome');

// 创建路由实例
const router = new Router({
  prefix: '/api/v1'
});

// 技师个人资料路由
router.get('/mechanics/me', authMiddleware, requireRole('mechanic'), mechanicProfile.getMyProfile);
router.patch('/mechanics/me', authMiddleware, requireRole('mechanic'), mechanicProfile.updateMyProfile);

// 技师工单路由
router.get('/mechanics/me/work-orders', authMiddleware, requireRole('mechanic'), mechanicWorkOrders.getMyWorkOrders);
router.post('/work-orders/:id/accept', authMiddleware, requireRole('mechanic'), mechanicWorkOrders.acceptWorkOrder);
router.post('/work-orders/:id/refuse', authMiddleware, requireRole('mechanic'), mechanicWorkOrders.refuseWorkOrder);
router.patch('/work-orders/:id/progress', authMiddleware, requireRole('mechanic'), mechanicWorkOrders.updateWorkOrderProgress);
router.post('/work-orders/:id/materials', authMiddleware, requireRole('mechanic'), mechanicWorkOrders.recordWorkOrderMaterials);
router.patch('/work-orders/:id/complete', authMiddleware, requireRole('mechanic'), mechanicWorkOrders.completeWorkOrder);

// 技师收入路由
router.get('/mechanics/me/income', authMiddleware, requireRole('mechanic'), mechanicIncome.getMonthlyIncome);

module.exports = router;
