/**
 * Swagger OpenAPI 示例应用
 * 演示如何在 Koa2 中使用 Swagger 生成 OpenAPI 文档
 */

const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const fs = require('fs').promises;
const path = require('path');

// 导入路由
const userRoutes = require('./routes/userRoutes');

// 导入 Swagger 工具
const swagger = require('./swagger');

const app = new Koa();
const router = new Router({ prefix: '/example' });

// 中间件
app.use(bodyParser());

// OpenAPI 相关路由
router.get('/api-docs.json', async (ctx) => {
  // 动态生成并返回 OpenAPI 规范
  const spec = swagger.generateApiSpec();
  ctx.body = spec;
});

// 生成 OpenAPI 文档文件
router.get('/api-docs/generate', async (ctx) => {
  try {
    // 生成规范对象
    const spec = swagger.generateApiSpec();
    
    // 保存到文件
    const success = await swagger.saveApiSpecToFile(spec);
    
    if (success) {
      ctx.body = {
        status: 'success',
        message: 'OpenAPI 规范已成功生成并保存到 docs/example-openapi.json'
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        status: 'error',
        message: '保存 OpenAPI 规范失败'
      };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '生成 OpenAPI 规范失败',
      error: error.message
    };
  }
});

// 提供 Swagger UI
router.get('/docs', async (ctx) => {
  try {
    // 读取 Swagger UI HTML 模板
    let html = await fs.readFile(path.join(__dirname, 'swagger-ui-template.html'), 'utf8');
    
    // 替换 API 文档 URL
    const baseUrl = `${ctx.protocol}://${ctx.host}`;
    html = html.replace('__OPENAPI_URL__', `${baseUrl}/example/api-docs.json`);
    
    ctx.type = 'text/html';
    ctx.body = html;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '加载 Swagger UI 失败',
      error: error.message
    };
  }
});

// 注册路由
app.use(router.routes()).use(router.allowedMethods());
app.use(userRoutes.routes()).use(userRoutes.allowedMethods());

// 创建 Swagger UI 模板文件
async function createSwaggerTemplate() {
  const templatePath = path.join(__dirname, 'swagger-ui-template.html');
  
  // 如果文件已存在，不重新创建
  try {
    await fs.access(templatePath);
    console.log('Swagger UI 模板已存在');
    return;
  } catch (err) {
    // 文件不存在，继续创建
  }
  
  const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>API 文档 - Swagger OpenAPI 示例</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.3.1/swagger-ui.css" >
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.3.1/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.3.1/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "__OPENAPI_URL__",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;
  
  await fs.writeFile(templatePath, template, 'utf8');
  console.log('Swagger UI 模板已创建');
}

// 启动前准备
async function bootstrap() {
  await createSwaggerTemplate();
  
  // 启动服务器
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`
====================================================
🚀 Swagger OpenAPI 示例服务已启动!

📚 Swagger UI: http://localhost:${PORT}/example/docs
📝 OpenAPI JSON: http://localhost:${PORT}/example/api-docs.json
💾 生成文档: http://localhost:${PORT}/example/api-docs/generate
====================================================
    `);
  });
}

bootstrap().catch(console.error);
