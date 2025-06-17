const path = require('path');
const fs = require('fs').promises;
const { createLogger } = require('../../middleware/logger');
const { generateApiSpec } = require('../../utils/apiDocs');

const logger = createLogger('System');

/**
 * @swagger
 * /api/v1/openapi.json:
 *   get:
 *     summary: 获取OpenAPI规范文档
 *     description: 返回系统的OpenAPI 3.0规范文档JSON格式
 *     tags: [System]
 *     responses:
 *       200:
 *         description: 成功返回OpenAPI规范文档
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: OpenAPI 3.0规范文档
 *               properties:
 *                 openapi:
 *                   type: string
 *                   example: "3.0.0"
 *                 info:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     version:
 *                       type: string
 *                     description:
 *                       type: string
 *                 servers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                 paths:
 *                   type: object
 *                   description: API路径定义
 *                 components:
 *                   type: object
 *                   description: 可重用组件
 *       500:
 *         description: 服务器错误
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
 * @swagger
 * /api/v1/docs:
 *   get:
 *     summary: 获取Swagger UI界面
 *     description: 返回Swagger UI文档界面，用于交互式API文档浏览
 *     tags: [System]
 *     responses:
 *       200:
 *         description: 成功返回Swagger UI页面
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Swagger UI HTML页面
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: 无法加载Swagger UI
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
 * @swagger
 * /api/v1/docs/generate:
 *   post:
 *     summary: 生成并保存OpenAPI规范文档
 *     description: 重新生成OpenAPI规范文档并保存到文件系统
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功生成并保存文档
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: OpenAPI规范已生成并保存
 *       401:
 *         description: 未授权
 *       500:
 *         description: 生成失败
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: 生成OpenAPI规范失败
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