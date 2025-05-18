const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const logger = require('koa-logger');
const json = require('koa-json');
const serve = require('koa-static');
const path = require('path');

// 导入路由
const routes = require('./routes');

// 创建 Koa 实例
const app = new Koa();

// 全局错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      status: 'error',
      message: err.message || '服务器内部错误'
    };
    ctx.app.emit('error', err, ctx);
  }
});

// 使用中间件
app.use(logger());          // 日志记录
app.use(cors());            // 跨域支持
app.use(bodyParser());      // 请求体解析
app.use(json({ pretty: false, param: 'pretty' }));  // JSON 美化
app.use(serve(path.join(__dirname, 'public')));     // 静态文件服务

// 注册路由
app.use(routes.routes()).use(routes.allowedMethods());

// 错误事件监听
app.on('error', (err, ctx) => {
  console.error('服务器错误:', err, ctx);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器已启动，监听端口: ${PORT}`);
});

module.exports = app;
