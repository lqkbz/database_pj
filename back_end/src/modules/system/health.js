const { createLogger } = require('../../middleware/logger');

const logger = createLogger('System');

/**
 * @swagger
 * /api/v1/healthz:
 *   get:
 *     summary: 系统健康检查
 *     description: 获取系统运行状态、内存使用情况和运行时间等信息
 *     tags: [System]
 *     responses:
 *       200:
 *         description: 系统状态正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                   description: 系统状态
 *                 uptime:
 *                   type: string
 *                   example: "2h 30m 45s"
 *                   description: 系统运行时间
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: 检查时间戳
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: string
 *                       example: "128MB"
 *                       description: 常驻内存大小
 *                     heapTotal:
 *                       type: string
 *                       example: "64MB"
 *                       description: 堆总大小
 *                     heapUsed:
 *                       type: string
 *                       example: "32MB"
 *                       description: 已使用堆大小
 *       500:
 *         description: 系统异常
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