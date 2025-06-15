# Swagger OpenAPI 导出示例

这个示例项目展示了如何在 Koa2 项目中使用 Swagger JSDoc 生成 OpenAPI 文档。

## 功能演示

1. 使用 JSDoc 注释定义 API
2. 使用 swagger-jsdoc 生成 OpenAPI 规范
3. 提供 Swagger UI 界面查看文档
4. 支持导出 OpenAPI 文档到文件

## 运行步骤

1. 安装依赖 (如果尚未安装)
   ```bash
   npm install koa @koa/router swagger-jsdoc swagger-ui-dist
   ```

2. 启动示例服务器
   ```bash
   node src/example/index.js
   ```

3. 访问 Swagger UI
   - 在浏览器中打开: http://localhost:3001/example/docs

4. 导出 API 文档
   - 访问: http://localhost:3001/example/api-docs/generate
   - 或者使用命令: `node src/example/generate-docs.js`

## 文件说明

- `index.js` - 主应用入口，设置 Koa 服务器
- `swagger.js` - Swagger/OpenAPI 配置和生成工具
- `controllers/userController.js` - 带有 Swagger 注释的示例控制器
- `routes/userRoutes.js` - API 路由定义
- `generate-docs.js` - 用于生成文档的独立脚本 