const Router = require('@koa/router');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 导入控制器
// 实际项目中需要实现这些控制器
const vehiclesController = require('../modules/customers/vehicles');

// 创建路由实例
const router = new Router({
  prefix: '/api/v1/vehicles'
});

// 车辆路由
router.get('/', authMiddleware, requireRole('customer'), vehiclesController.getMyVehicles);
router.post('/', authMiddleware, requireRole('customer'), vehiclesController.addVehicle);
router.get('/:id', authMiddleware, requireRole('customer'), vehiclesController.getVehicleById);
router.patch('/:id', authMiddleware, requireRole('customer'), vehiclesController.updateVehicle);
router.delete('/:id', authMiddleware, requireRole('customer'), vehiclesController.deleteVehicle);

module.exports = router;
