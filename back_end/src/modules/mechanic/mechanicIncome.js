const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('MechanicIncome');

/**
 * 获取技师月收入统计
 * 
 * @param {Object} ctx - Koa上下文
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
