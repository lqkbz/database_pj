const path = require('path');
const fs = require('fs').promises;
const mime = require('mime-types');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('System');

/**
 * 静态文件服务中间件
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.root - 静态文件根目录
 * @param {string[]} options.allowedExtensions - 允许的文件扩展名
 * @returns {Function} Koa中间件函数
 */
const createStaticMiddleware = (options = {}) => {
  const {
    root = path.join(__dirname, '../../../public'),
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js', '.html', '.pdf', '.ico']
  } = options;
  
  return async (ctx, next) => {
    // 检查是否是以/static/开头的路径
    if (!ctx.path.startsWith('/static/')) {
      return next();
    }
    
    try {
      // 从URL获取文件路径
      const relativePath = ctx.path.replace('/static/', '');
      const filePath = path.join(root, relativePath);
      
      // 安全检查：防止目录遍历
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(root)) {
        logger.warn(`尝试访问目录外的文件: ${relativePath}`);
        ctx.status = 403;
        ctx.body = { status: 'error', message: '访问被禁止' };
        return;
      }
      
      // 检查文件扩展名
      const ext = path.extname(filePath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        logger.warn(`尝试访问不允许的文件类型: ${ext}`);
        ctx.status = 403;
        ctx.body = { status: 'error', message: '文件类型不允许' };
        return;
      }
      
      // 检查文件是否存在
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        logger.warn(`请求的资源不是文件: ${filePath}`);
        ctx.status = 404;
        ctx.body = { status: 'error', message: '文件不存在' };
        return;
      }
      
      // 设置正确的Content-Type
      ctx.type = mime.lookup(filePath) || 'application/octet-stream';
      
      // 读取文件内容
      const fileContent = await fs.readFile(filePath);
      
      // 设置缓存控制
      ctx.set('Cache-Control', 'public, max-age=86400');
      
      // 返回文件内容
      ctx.body = fileContent;
      
      logger.info(`提供静态文件: ${relativePath}`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.warn(`文件不存在: ${ctx.path}`);
        ctx.status = 404;
        ctx.body = { status: 'error', message: '文件不存在' };
      } else {
        logger.error(`提供静态文件时出错: ${err.message}`);
        ctx.status = 500;
        ctx.body = { status: 'error', message: '服务器内部错误' };
      }
    }
  };
};

module.exports = {
  createStaticMiddleware
}; 