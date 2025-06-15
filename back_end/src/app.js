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
const { createStaticMiddleware } = require('./modules/system/static');
const { checkAccessControl } = require('./middleware/rbac');

// 创建 Koa 实例
const app = new Koa();

// 中间件注册顺序（洋葱模型，由外到内）

// 1. 日志中间件 - 应该是第一个，记录所有请求
app.use(loggerMiddleware);

// 2. 全局错误处理中间件 - 捕获所有后续中间件中的错误
app.use(errorHandler);

// 3. 基础中间件
app.use(cors());            // 跨域支持
app.use(bodyParser());      // 请求体解析
app.use(json({ pretty: false, param: 'pretty' }));  // JSON 美化
app.use(helmet());          // 安全头部
app.use(compress());        // 压缩响应

// 4. 注册静态文件服务中间件
app.use(createStaticMiddleware({
  root: path.join(__dirname, '../public'),
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js', '.html', '.pdf', '.ico', '.woff', '.woff2', '.ttf']
}));

// 5. 注册访问控制中间件
app.use(checkAccessControl);

// 6. 注册路由
app.use(router);

// 7. 404 错误处理 - 必须放在路由之后
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
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const { createLogger } = require('./middleware/logger');
  const serverLogger = createLogger('Server');
  serverLogger.info(`服务器已启动，监听端口: ${PORT}`);
});

module.exports = app;
 