const Router = require('koa-router');
const router = new Router();

// Import customer modules
const { getMyProfile, updateMyProfile } = require('../modules/customers/userProfile');
const { getMyVehicles, addVehicle, getVehicleById, updateVehicle, deleteVehicle } = require('../modules/customers/vehicles');
const { getMyWorkOrders, createWorkOrder, getWorkOrderById, addWorkOrderFeedback, urgeWorkOrder } = require('../modules/customers/workOrder');

// Import middleware
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('CustomerRoutes');

// Middleware to ensure only customers and admins can access customer routes
const customerAccess = requireRole(['customer', 'admin']);

// User profile routes (按API文档路径)
// 用户档案路由 - 需要customer或admin角色
router.get('/api/v1/users/me', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 查看个人档案`);
  await getMyProfile(ctx, next);
});

router.patch('/api/v1/users/me', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 更新个人档案`);
  await updateMyProfile(ctx, next);
});

// Vehicle routes
// 车辆管理路由 - 需要customer或admin角色
router.post('/api/v1/vehicles', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 添加车辆`);
  await addVehicle(ctx, next);
});

router.get('/api/v1/vehicles', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 查看车辆列表`);
  await getMyVehicles(ctx, next);
});

router.get('/api/v1/vehicles/:id', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 查看车辆详情: ${ctx.params.id}`);
  await getVehicleById(ctx, next);
});

router.patch('/api/v1/vehicles/:id', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 更新车辆信息: ${ctx.params.id}`);
  await updateVehicle(ctx, next);
});

router.delete('/api/v1/vehicles/:id', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 删除车辆: ${ctx.params.id}`);
  await deleteVehicle(ctx, next);
});

// Work order routes
// 工单管理路由 - 需要customer或admin角色
router.post('/api/v1/work-orders', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 创建工单`);
  await createWorkOrder(ctx, next);
});

router.get('/api/v1/work-orders', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 查看工单列表`);
  await getMyWorkOrders(ctx, next);
});

router.get('/api/v1/work-orders/:id', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 查看工单详情: ${ctx.params.id}`);
  await getWorkOrderById(ctx, next);
});

router.post('/api/v1/work-orders/:id/feedback', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 提交工单反馈: ${ctx.params.id}`);
  await addWorkOrderFeedback(ctx, next);
});

router.post('/api/v1/work-orders/:id/urge', authMiddleware, customerAccess, async (ctx, next) => {
  logger.info(`用户 ${ctx.state.user.id} 催促工单: ${ctx.params.id}`);
  await urgeWorkOrder(ctx, next);
});

module.exports = router;
