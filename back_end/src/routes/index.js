const Router = require('koa-router');
const router = new Router();

// Import route modules
const adminRouter = require('./admin');
const authRouter = require('./auth');
const customersRouter = require('./customers');
const mechanicRouter = require('./mechanic');
const { router: systemRouter } = require('./system');

// Register routes
router.use(adminRouter.routes(), adminRouter.allowedMethods());
router.use(authRouter.routes(), authRouter.allowedMethods());
router.use(customersRouter.routes(), customersRouter.allowedMethods());
router.use(mechanicRouter.routes(), mechanicRouter.allowedMethods());
router.use(systemRouter.routes(), systemRouter.allowedMethods());

// Root route for API health check
router.get('/', async (ctx) => {
  ctx.body = {
    status: 'success',
    message: 'API is running'
  };
});

module.exports = router;
