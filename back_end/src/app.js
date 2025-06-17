const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const helmet = require('koa-helmet');
const compress = require('koa-compress');
const json = require('koa-json');
const path = require('path');

// 导入路由
const router = require('./routes');

// 导入所有中间件
const { errorHandler, notFoundHandler } = require('./middleware/errorhandler');
const { loggerMiddleware } = require('./middleware/logger');
const { authMiddleware, optionalAuth } = require('./middleware/auth');
const { checkVehicleRepairAccess } = require('./middleware/rbac');
const { createStaticMiddleware } = require('./modules/system/static');

// 创建 Koa 实例
const app = new Koa();

// 中间件注册顺序（洋葱模型，由外到内）
// 注意：顺序很重要，错误处理必须在最外层，认证在业务逻辑之前

// 1. 日志中间件 - 应该是第一个，记录所有请求
app.use(loggerMiddleware);

// 2. 全局错误处理中间件 - 捕获所有后续中间件中的错误
app.use(errorHandler);

// 3. 基础中间件
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept']
}));            // 跨域支持
app.use(bodyParser({
  jsonLimit: '10mb',
  formLimit: '10mb',
  textLimit: '10mb'
}));      // 请求体解析
app.use(json({ pretty: false, param: 'pretty' }));  // JSON 美化
app.use(helmet({  // 安全头部
  contentSecurityPolicy: false  // 对于API服务，可以关闭CSP
}));
app.use(compress());        // 压缩响应

// 4. 注册静态文件服务中间件
app.use(createStaticMiddleware({
  root: path.join(__dirname, '../public'),
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js', '.html', '.pdf', '.ico', '.woff', '.woff2', '.ttf']
}));

// 5. 认证中间件 - 可选认证，允许公共路径通过
// 注意：这里使用optionalAuth，因为某些路径（如登录、注册）不需要认证
// 具体的认证要求在访问控制中间件和各个路由中处理
app.use(optionalAuth);

// 6. 车辆维修系统专用访问控制中间件
// 该中间件会根据用户角色和请求路径进行精确的权限控制
app.use(checkVehicleRepairAccess);

// 7. 注册路由
app.use(router.routes());
app.use(router.allowedMethods());

// 8. 404 错误处理 - 必须放在路由之后
app.use(notFoundHandler);

// 错误事件监听
app.on('error', (err, ctx) => {
  // 使用logError函数记录错误
  const { logError } = require('./middleware/logger');
  logError(err, ctx);
  
  console.error('应用错误事件:', {
    message: err.message,
    code: err.code || 'INTERNAL_ERROR',
    stack: err.stack,
    url: ctx?.url,
    method: ctx?.method,
    user: ctx?.state?.user ? {
      id: ctx.state.user.id,
      role: ctx.state.user.role
    } : null,
    timestamp: new Date().toISOString()
  });
});

// 应用优雅关闭处理
process.on('SIGTERM', () => {
  const { createLogger } = require('./middleware/logger');
  const serverLogger = createLogger('Server');
  serverLogger.info('收到SIGTERM信号，准备关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  const { createLogger } = require('./middleware/logger');
  const serverLogger = createLogger('Server');
  serverLogger.info('收到SIGINT信号，准备关闭服务器...');
  process.exit(0);
});

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  const { createLogger } = require('./middleware/logger');
  const serverLogger = createLogger('Server');
  serverLogger.error('未捕获异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const { createLogger } = require('./middleware/logger');
  const serverLogger = createLogger('Server');
  serverLogger.error('未处理的Promise拒绝:', reason);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  const { createLogger } = require('./middleware/logger');
  const serverLogger = createLogger('Server');
  serverLogger.info(`车辆维修管理系统后端服务已启动`);
  serverLogger.info(`监听端口: ${PORT}`);
  serverLogger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
  serverLogger.info(`API文档: http://localhost:${PORT}/api/v1/docs`);
});

// 导出app实例用于测试
module.exports = app;
 