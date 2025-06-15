const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('MechanicIncome');

/**
 * @swagger
 * /api/mechanic/income/monthly:
 *   get:
 *     summary: 获取技师月收入统计
 *     description: 获取当前登录技师指定月份的收入统计数据
 *     tags: [Mechanic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: 月份(1-12)，默认为当前月
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *         description: 年份，默认为当前年
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     income:
 *                       type: object
 *                       properties:
 *                         month:
 *                           type: integer
 *                         year:
 *                           type: integer
 *                         totalIncome:
 *                           type: number
 *                         completedOrders:
 *                           type: integer
 *                         incomeByDay:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               day:
 *                                 type: integer
 *                               income:
 *                                 type: number
 *                         incomeByType:
 *                           type: object
 *                           properties:
 *                             labor:
 *                               type: number
 *                             parts:
 *                               type: number
 *                         topServices:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                               income:
 *                                 type: number
 *                         comparison:
 *                           type: object
 *                           properties:
 *                             previousMonth:
 *                               type: number
 *                             percentChange:
 *                               type: number
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getMonthlyIncome = async (ctx) => {
  const { user } = ctx.state;
  const { month, year } = ctx.query;
  
  // 默认为当前月份
  const now = new Date();
  const currentMonth = month ? parseInt(month) : now.getMonth() + 1;
  const currentYear = year ? parseInt(year) : now.getFullYear();
  
  // 验证月份和年份
  if (currentMonth < 1 || currentMonth > 12) {
    throw createError.validation('月份必须在1-12之间');
  }
  
  if (currentYear < 2000 || currentYear > now.getFullYear()) {
    throw createError.validation('年份无效');
  }
  
  // 获取月收入数据（从数据库）
  // 实际项目中替换为数据库查询
  const monthlyIncome = {
    month: currentMonth,
    year: currentYear,
    totalIncome: 12800,
    completedOrders: 16,
    incomeByDay: [
      { day: 1, income: 0 },
      { day: 2, income: 1200 },
      { day: 3, income: 800 },
      // ... 其他日期的收入
      { day: 15, income: 1500 },
      { day: 16, income: 900 },
      { day: 20, income: 1100 },
      { day: 25, income: 1600 },
      { day: 30, income: 2000 }
    ],
    incomeByType: {
      labor: 4800,
      parts: 8000
    },
    topServices: [
      { name: '发动机维修', count: 5, income: 4500 },
      { name: '更换刹车片', count: 4, income: 2800 },
      { name: '更换机油和滤清器', count: 7, income: 3500 }
    ],
    comparison: {
      previousMonth: 11500,
      percentChange: 11.3
    }
  };
  
  logger.info(`技师 ${user.id} 查询了 ${currentYear}年${currentMonth}月的收入`);
  
  ctx.body = {
    status: 'success',
    data: {
      income: monthlyIncome
    }
  };
};

module.exports = {
  getMonthlyIncome
};
