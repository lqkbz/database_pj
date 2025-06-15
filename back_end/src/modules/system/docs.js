const path = require('path');
const fs = require('fs').promises;
const { createLogger } = require('../../middleware/logger');
const { generateApiSpec } = require('../../utils/apiDocs');

const logger = createLogger('System');

/**
 * 获取OpenAPI规范文档
 * 
 * @param {Object} ctx - Koa上下文
 */
const getOpenApiSpec = async (ctx) => {
  try {
    // 动态生成OpenAPI规范而不是从文件读取
    const openApiSpec = generateApiSpec();
    
    // 添加服务器信息
    const baseUrl = `${ctx.protocol}://${ctx.host}`;
    if (!openApiSpec.servers) {
      openApiSpec.servers = [{ url: baseUrl }];
    } else {
      // 更新第一个服务器的URL为当前请求的URL
      openApiSpec.servers[0].url = baseUrl + '/api/v1';
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

/**
 * 生成并保存OpenAPI规范
 * 
 * @param {Object} ctx - Koa上下文
 */
const generateOpenApiSpec = async (ctx) => {
  try {
    const apiDocs = require('../../utils/apiDocs');
    const openApiSpec = apiDocs.generateApiSpec();
    const success = await apiDocs.saveApiSpecToFile(openApiSpec);
    
    if (success) {
      ctx.body = {
        status: 'success',
        message: 'OpenAPI规范已生成并保存'
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        status: 'error',
        message: '生成OpenAPI规范失败'
      };
    }
  } catch (err) {
    logger.error(`生成OpenAPI规范失败: ${err.message}`);
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '生成OpenAPI规范失败'
    };
  }
};

module.exports = {
  getOpenApiSpec,
  getSwaggerUI,
  generateOpenApiSpec
}; 