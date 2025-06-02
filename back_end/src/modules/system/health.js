const { createLogger } = require('../../middleware/logger');

const logger = createLogger('System');

/**
 * 健康检查接口
 * 返回系统运行状态信息
 * 
 * @param {Object} ctx - Koa上下文
 */
const healthCheck = async (ctx) => {
  const startTime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  const healthInfo = {
    status: 'ok',
    uptime: `${Math.floor(startTime / 60 / 60)}h ${Math.floor(startTime / 60) % 60}m ${Math.floor(startTime) % 60}s`,
    timestamp: new Date().toISOString(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    }
  };

  logger.info(`健康检查: 状态 - ${healthInfo.status}, 运行时间 - ${healthInfo.uptime}`);
  
  ctx.body = healthInfo;
};

module.exports = {
  healthCheck
}; 