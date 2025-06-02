const Router = require('@koa/router');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 导入控制器
// 实际项目中需要实现这些控制器
const workOrdersController = require('../modules/customers/workOrders');

// 创建路由实例
const router = new Router({
  prefix: '/api/v1/work-orders'
});

// 工单路由
router.get('/', authMiddleware, requireRole('customer'), workOrdersController.getMyWorkOrders);
router.post('/', authMiddleware, requireRole('customer'), workOrdersController.createWorkOrder);
router.get('/:id', authMiddleware, requireRole('customer'), workOrdersController.getWorkOrderById);
router.post('/:id/feedback', authMiddleware, requireRole('customer'), workOrdersController.addWorkOrderFeedback);
router.post('/:id/urge', authMiddleware, requireRole('customer'), workOrdersController.urgeWorkOrder);

module.exports = router;
