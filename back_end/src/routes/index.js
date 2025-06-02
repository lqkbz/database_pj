const combineRouters = require('koa-combine-routers');
const authRouter = require('./auth');
const userProfileRouter = require('./userprofile');
const vehiclesRouter = require('./vehicles');
const workOrderRouter = require('./workOrder');
const mechanicRouter = require('./mechanic');
const adminRouter = require('./admin');
const systemRouter = require('./system');

// 将所有路由合并
const router = combineRouters(
  authRouter,
  userProfileRouter,
  vehiclesRouter,
  workOrderRouter,
  mechanicRouter,
  adminRouter,
  systemRouter
);

module.exports = router;
