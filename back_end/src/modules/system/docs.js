const path = require('path');
const fs = require('fs').promises;
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('System');

/**
 * 获取OpenAPI规范文档
 * 
 * @param {Object} ctx - Koa上下文
 */
const getOpenApiSpec = async (ctx) => {
  try {
    // 从文件中读取OpenAPI规范
    const openApiPath = path.join(__dirname, '../../../docs/openapi.json');
    const openApiContent = await fs.readFile(openApiPath, 'utf8');
    const openApiSpec = JSON.parse(openApiContent);
    
    // 添加服务器信息
    const baseUrl = `${ctx.protocol}://${ctx.host}`;
    if (!openApiSpec.servers) {
      openApiSpec.servers = [{ url: baseUrl }];
    }
    
    logger.info('OpenAPI规范已请求');
    
    ctx.type = 'application/json';
    ctx.body = openApiSpec;
  } catch (err) {
    logger.error(`获取OpenAPI规范失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '无法加载API规范文档'
    };
  }
};

/**
 * 提供Swagger UI界面
 * 
 * @param {Object} ctx - Koa上下文
 */
const getSwaggerUI = async (ctx) => {
  try {
    // 从模板文件加载Swagger UI HTML
    const swaggerUIPath = path.join(__dirname, '../../../docs/swagger-ui.html');
    let swaggerUI = await fs.readFile(swaggerUIPath, 'utf8');
    
    // 替换URL占位符
    const baseUrl = `${ctx.protocol}://${ctx.host}`;
    swaggerUI = swaggerUI.replace('__OPENAPI_URL__', `${baseUrl}/api/v1/openapi.json`);
    
    logger.info('Swagger UI已请求');
    
    ctx.type = 'text/html';
    ctx.body = swaggerUI;
  } catch (err) {
    logger.error(`获取Swagger UI失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '无法加载Swagger UI'
    };
  }
};

module.exports = {
  getOpenApiSpec,
  getSwaggerUI
}; 