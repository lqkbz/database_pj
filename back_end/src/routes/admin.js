const Router = require('koa-router');
const router = new Router();

// Import admin modules
const userManagement = require('../modules/admin/userManagement');
const mechanicManagement = require('../modules/admin/mechanicManagement');
const vehiclesWorkorders = require('../modules/admin/vehicles_workorders');
const inventory = require('../modules/admin/inventory');
const finance = require('../modules/admin/finance');
const vehicleRepair = require('../modules/admin/vehicleRepair');
const costStructure = require('../modules/admin/costStructure');
const feedback = require('../modules/admin/feedback');
const workload = require('../modules/admin/workload');
const orders = require('../modules/admin/orders');

// Import middleware
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('AdminRoutes');

// Middleware to ensure only admins can access admin routes
const adminAccess = requireRole(['admin']);

// =====================================================
// User & Mechanic Management (/api/v1/admin)
// =====================================================

// User Management routes - 需要admin角色
router.get('/api/v1/admin/users', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看用户列表`);
  await userManagement.listUsers(ctx, next);
});

router.get('/api/v1/admin/users/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看用户详情: ${ctx.params.id}`);
  await userManagement.getUserDetail(ctx, next);
});

router.patch('/api/v1/admin/users/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 更新用户信息: ${ctx.params.id}`);
  await userManagement.updateUser(ctx, next);
});

// Mechanic Management routes - 需要admin角色
router.get('/api/v1/admin/mechanics', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看技师列表`);
  await mechanicManagement.listMechanics(ctx, next);
});

router.get('/api/v1/admin/mechanics/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看技师详情: ${ctx.params.id}`);
  await mechanicManagement.getMechanicDetail(ctx, next);
});

router.post('/api/v1/admin/mechanics', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 创建技师`);
  await mechanicManagement.createMechanic(ctx, next);
});

router.patch('/api/v1/admin/mechanics/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 更新技师信息: ${ctx.params.id}`);
  await mechanicManagement.updateMechanic(ctx, next);
});

router.delete('/api/v1/admin/mechanics/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 删除技师: ${ctx.params.id}`);
  await mechanicManagement.deleteMechanic(ctx, next);
});

// =====================================================
// Vehicles & Work Orders (/api/v1/admin)
// =====================================================

// Vehicles routes - 需要admin角色
router.get('/api/v1/admin/vehicles', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看车辆列表`);
  await vehiclesWorkorders.listVehicles(ctx, next);
});

// Work Orders routes - 需要admin角色
router.get('/api/v1/admin/work-orders', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看工单列表`);
  await vehiclesWorkorders.listWorkOrders(ctx, next);
});

router.patch('/api/v1/admin/work-orders/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 更新工单: ${ctx.params.id}`);
  await vehiclesWorkorders.updateWorkOrder(ctx, next);
});

router.delete('/api/v1/admin/work-orders/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 删除工单: ${ctx.params.id}`);
  await vehiclesWorkorders.deleteWorkOrder(ctx, next);
});

// =====================================================
// Inventory (/api/v1/admin)
// =====================================================

// Parts Management routes - 需要admin角色
router.get('/api/v1/admin/parts', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看配件列表`);
  await inventory.listParts(ctx, next);
});

router.get('/api/v1/admin/parts/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看配件详情: ${ctx.params.id}`);
  await inventory.getPartDetail(ctx, next);
});

router.post('/api/v1/admin/parts', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 创建配件`);
  await inventory.createPart(ctx, next);
});

router.patch('/api/v1/admin/parts/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 更新配件信息: ${ctx.params.id}`);
  await inventory.updatePart(ctx, next);
});

router.delete('/api/v1/admin/parts/:id', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 删除配件: ${ctx.params.id}`);
  await inventory.deletePart(ctx, next);
});

// Inventory Management routes - 需要admin角色
router.post('/api/v1/admin/inventory/in', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 库存入库`);
  await inventory.inventoryIn(ctx, next);
});

router.post('/api/v1/admin/inventory/out', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 库存出库`);
  await inventory.inventoryOut(ctx, next);
});

router.get('/api/v1/admin/inventory/txns', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看库存交易记录`);
  await inventory.getInventoryTransactions(ctx, next);
});

// =====================================================
// Finance (/api/v1/admin)
// =====================================================

// Finance routes - 需要admin角色
router.get('/api/v1/admin/payments', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看支付记录`);
  await finance.getPayments(ctx, next);
});

router.get('/api/v1/admin/payroll', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看工资记录`);
  await finance.getPayroll(ctx, next);
});

// =====================================================
// Reports (/api/v1/admin/stats)
// =====================================================

// Statistics and Reports routes - 需要admin角色
router.get('/api/v1/admin/stats/vehicle-repair', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看车辆维修统计`);
  await vehicleRepair.getVehicleRepairStats(ctx, next);
});

router.get('/api/v1/admin/stats/cost-structure', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看成本结构统计`);
  await costStructure.getCostStructureStats(ctx, next);
});

router.get('/api/v1/admin/stats/negative-feedback', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看负面反馈统计`);
  await feedback.getNegativeFeedbackStats(ctx, next);
});

router.get('/api/v1/admin/stats/unfinished-orders', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看未完成工单统计`);
  await orders.getUnfinishedOrdersStats(ctx, next);
});

router.get('/api/v1/admin/stats/trade-workload', authMiddleware, adminAccess, async (ctx, next) => {
  logger.info(`管理员 ${ctx.state.user.id} 查看工种工作量统计`);
  await workload.getTradeWorkloadStats(ctx, next);
});

module.exports = router;
