const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs').promises;

/**
 * 生成OpenAPI规范文档的选项
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '车辆维修管理系统 API',
      version: '1.0.0',
      description: '车辆维修管理系统的RESTful API文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: '车辆维修管理系统API服务'
      }
    ],
    tags: [
      { name: 'auth', description: '认证相关接口' },
      { name: 'admin', description: '管理员相关接口' },
      { name: 'mechanic', description: '维修工相关接口' },
      { name: 'customers', description: '客户相关接口' },
      { name: 'system', description: '系统相关接口' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // 配置所有包含API注释的文件路径
  apis: [
    path.join(__dirname, '../modules/**/*.js'),
    path.join(__dirname, '../models/*.js')
  ]
};

/**
 * 生成OpenAPI规范文档
 * @returns {Object} OpenAPI规范对象
 */
function generateApiSpec() {
  // 使用swagger-jsdoc生成规范
  const swaggerSpec = swaggerJSDoc(options);
  
  return swaggerSpec;
}

/**
 * 将OpenAPI规范保存到文件
 * @param {Object} spec OpenAPI规范对象
 * @returns {Promise<void>}
 */
async function saveApiSpecToFile(spec) {
  try {
    const outputPath = path.join(__dirname, '../../docs/openapi.json');
    await fs.writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf8');
    console.log(`OpenAPI规范已保存至: ${outputPath}`);
    return true;
  } catch (err) {
    console.error('保存OpenAPI规范失败:', err);
    return false;
  }
}

module.exports = {
  generateApiSpec,
  saveApiSpecToFile
}; 