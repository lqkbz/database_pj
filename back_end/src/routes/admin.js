const Router = require('@koa/router');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// 导入管理员控制器
const userManagement = require('../modules/admin/userManagement');
const mechanicManagement = require('../modules/admin/mechanicManagement');
const vehiclesWorkOrders = require('../modules/admin/vehicles_workorders');
const inventory = require('../modules/admin/inventory');
const finance = require('../modules/admin/finance');

// 创建路由实例
const router = new Router({
  prefix: '/api/v1/admin'
});

// 中间件：确保只有管理员可以访问这些路由
const adminOnly = requireRole('admin');

// 用户管理路由
router.get('/users', authMiddleware, adminOnly, userManagement.listUsers);
router.get('/users/:id', authMiddleware, adminOnly, userManagement.getUserDetail);
router.patch('/users/:id', authMiddleware, adminOnly, userManagement.updateUser);

// 技师管理路由
router.get('/mechanics', authMiddleware, adminOnly, mechanicManagement.listMechanics);
router.get('/mechanics/:id', authMiddleware, adminOnly, mechanicManagement.getMechanicDetail);
router.post('/mechanics', authMiddleware, adminOnly, mechanicManagement.createMechanic);
router.patch('/mechanics/:id', authMiddleware, adminOnly, mechanicManagement.updateMechanic);
router.delete('/mechanics/:id', authMiddleware, adminOnly, mechanicManagement.deleteMechanic);

// 车辆和工单管理路由
router.get('/vehicles', authMiddleware, adminOnly, vehiclesWorkOrders.listVehicles);
router.get('/work-orders', authMiddleware, adminOnly, vehiclesWorkOrders.listWorkOrders);
router.patch('/work-orders/:id', authMiddleware, adminOnly, vehiclesWorkOrders.updateWorkOrder);
router.delete('/work-orders/:id', authMiddleware, adminOnly, vehiclesWorkOrders.deleteWorkOrder);

// 库存管理路由
router.get('/parts', authMiddleware, adminOnly, inventory.listParts);
router.get('/parts/:id', authMiddleware, adminOnly, inventory.getPartDetail);
router.post('/parts', authMiddleware, adminOnly, inventory.createPart);
router.patch('/parts/:id', authMiddleware, adminOnly, inventory.updatePart);
router.delete('/parts/:id', authMiddleware, adminOnly, inventory.deletePart);
router.post('/inventory/in', authMiddleware, adminOnly, inventory.inventoryIn);
router.post('/inventory/out', authMiddleware, adminOnly, inventory.inventoryOut);
router.get('/inventory/txns', authMiddleware, adminOnly, inventory.getInventoryTransactions);

// 财务管理路由
router.get('/payments', authMiddleware, adminOnly, finance.getPayments);
router.get('/payroll', authMiddleware, adminOnly, finance.getPayroll);

module.exports = router;