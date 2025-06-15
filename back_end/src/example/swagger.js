/**
 * Swagger OpenAPI 配置和生成工具
 * 简化版的 apiDocs.js
 */

const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs').promises;

// OpenAPI 基本配置
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Koa2 Swagger 示例 API',
      version: '1.0.0',
      description: '演示如何使用 Swagger JSDoc 生成 OpenAPI 文档',
      contact: {
        name: 'API 示例支持',
        email: 'example@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/example',
        description: '示例开发服务器'
      }
    ],
    tags: [
      { name: 'users', description: '用户管理相关接口' },
      { name: 'docs', description: '文档相关接口' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  // 配置包含API注释的文件路径
  apis: [
    path.join(__dirname, './controllers/*.js'),
    path.join(__dirname, './routes/*.js')
  ]
};

/**
 * 生成 OpenAPI 规范文档
 * @returns {Object} OpenAPI 规范对象
 */
function generateApiSpec() {
  console.log('正在生成 OpenAPI 规范...');
  const swaggerSpec = swaggerJSDoc(options);
  return swaggerSpec;
}

/**
 * 将 OpenAPI 规范保存到文件
 * @param {Object} spec OpenAPI 规范对象
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveApiSpecToFile(spec) {
  try {
    // 创建 docs 目录 (如果不存在)
    const docsDir = path.join(__dirname, '../../docs');
    try {
      await fs.mkdir(docsDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    const outputPath = path.join(docsDir, 'example-openapi.json');
    await fs.writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf8');
    console.log(`OpenAPI 规范已保存至: ${outputPath}`);
    return true;
  } catch (err) {
    console.error('保存 OpenAPI 规范失败:', err);
    return false;
  }
}

module.exports = {
  generateApiSpec,
  saveApiSpecToFile
}; 