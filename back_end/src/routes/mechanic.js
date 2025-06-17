const Router = require('koa-router');
const router = new Router();

// Import mechanic modules
const { getMyProfile, updateMyProfile } = require('../modules/mechanic/mechanicProfile');
const { getMonthlyIncome } = require('../modules/mechanic/mechanicIncome');
const { 
  getMyWorkOrders, 
  acceptWorkOrder, 
  refuseWorkOrder, 
  updateWorkOrderProgress, 
  recordWorkOrderMaterials, 
  completeWorkOrder 
} = require('../modules/mechanic/mechanicWorkOrders');

// Import middleware
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('MechanicRoutes');

// Middleware to ensure only mechanics and admins can access mechanic routes
const mechanicAccess = requireRole(['mechanic', 'admin']);

// Profile routes (按API文档路径)
// 技师档案路由 - 需要mechanic或admin角色
router.get('/api/v1/mechanics/me', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 查看个人档案`);
  await getMyProfile(ctx, next);
});

router.patch('/api/v1/mechanics/me', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 更新个人档案`);
  await updateMyProfile(ctx, next);
});

// Income routes
// 收入查询路由 - 需要mechanic或admin角色
router.get('/api/v1/mechanics/me/income', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 查看月收入`);
  await getMonthlyIncome(ctx, next);
});

// Work order routes (按API文档路径)
// 工单管理路由 - 需要mechanic或admin角色
router.get('/api/v1/mechanics/me/work-orders', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 查看工单列表`);
  await getMyWorkOrders(ctx, next);
});

// 工单操作路由 - 所有技师都可以操作，但需要验证工单是否分配给自己
router.post('/api/v1/work-orders/:id/accept', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 接受工单: ${ctx.params.id}`);
  await acceptWorkOrder(ctx, next);
});

router.post('/api/v1/work-orders/:id/refuse', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 拒绝工单: ${ctx.params.id}`);
  await refuseWorkOrder(ctx, next);
});

router.patch('/api/v1/work-orders/:id/progress', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 更新工单进度: ${ctx.params.id}`);
  await updateWorkOrderProgress(ctx, next);
});

router.post('/api/v1/work-orders/:id/materials', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 记录工单材料: ${ctx.params.id}`);
  await recordWorkOrderMaterials(ctx, next);
});

router.patch('/api/v1/work-orders/:id/complete', authMiddleware, mechanicAccess, async (ctx, next) => {
  logger.info(`技师 ${ctx.state.user.id} 完成工单: ${ctx.params.id}`);
  await completeWorkOrder(ctx, next);
});

module.exports = router;
