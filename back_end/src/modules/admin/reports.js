const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminReports');

/**
 * @swagger
 * /api/admin/reports/sales:
 *   get:
 *     summary: 获取销售报表
 *     description: 获取指定时间范围内的销售统计数据
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         default: month
 *         description: 时间范围
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期 (YYYY-MM-DD)
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
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getSalesReport = async (ctx) => {
  const { timeRange = 'month', startDate, endDate } = ctx.query;
  
  // 构建查询条件
  const query = { timeRange };
  
  if (startDate) {
    query.startDate = startDate;
  }
  
  if (endDate) {
    query.endDate = endDate;
  }
  
  // 从数据库获取统计数据
  // 实际项目中替换为数据库聚合查询
  
  // 销售报表数据
  const salesReport = {
    timeRange: query.timeRange,
    startDate: query.startDate || '2023-01-01',
    endDate: query.endDate || '2023-05-31',
    totalSales: 356800.00,
    totalOrders: 248,
    averageOrderValue: 1438.71,
    salesByCategory: [
      { category: '常规保养', amount: 78500.00, percentage: 22.00 },
      { category: '发动机维修', amount: 98200.00, percentage: 27.52 },
      { category: '电子系统', amount: 65300.00, percentage: 18.30 },
      { category: '底盘调校', amount: 58600.00, percentage: 16.42 },
      { category: '其他维修', amount: 56200.00, percentage: 15.75 }
    ],
    salesByMonth: [
      { month: '1月', amount: 58500.00 },
      { month: '2月', amount: 62300.00 },
      { month: '3月', amount: 70500.00 },
      { month: '4月', amount: 78200.00 },
      { month: '5月', amount: 87300.00 }
    ],
    topCustomers: [
      { customerId: 'user1', name: '张三', totalSpent: 12500.00, orderCount: 5 },
      { customerId: 'user2', name: '李四', totalSpent: 9800.00, orderCount: 3 },
      { customerId: 'user5', name: '赵六', totalSpent: 8700.00, orderCount: 4 }
    ],
    topMechanics: [
      { mechanicId: 'mech1', name: '李师傅', totalSales: 85600.00, orderCount: 55 },
      { mechanicId: 'mech2', name: '王师傅', totalSales: 72400.00, orderCount: 42 },
      { mechanicId: 'mech3', name: '张师傅', totalSales: 65300.00, orderCount: 38 }
    ]
  };
  
  logger.info(`管理员查询了销售报表`);
  
  ctx.body = {
    status: 'success',
    data: salesReport
  };
};

/**
 * @swagger
 * /api/admin/reports/performance:
 *   get:
 *     summary: 获取业绩报表
 *     description: 获取指定时间范围内的业务绩效统计数据
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         default: month
 *         description: 时间范围
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期 (YYYY-MM-DD)
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
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getPerformanceReport = async (ctx) => {
  const { timeRange = 'month', startDate, endDate } = ctx.query;
  
  // 构建查询条件
  const query = { timeRange };
  
  if (startDate) {
    query.startDate = startDate;
  }
  
  if (endDate) {
    query.endDate = endDate;
  }
  
  // 从数据库获取统计数据
  // 实际项目中替换为数据库聚合查询
  
  // 业绩报表数据
  const performanceReport = {
    timeRange: query.timeRange,
    startDate: query.startDate || '2023-01-01',
    endDate: query.endDate || '2023-05-31',
    totalRevenue: 356800.00,
    totalCost: 246500.00,
    grossProfit: 110300.00,
    grossMargin: 30.91,
    orderCompletionRate: 87.10,
    averageCompletionTime: '1.8天',
    customerSatisfaction: 4.2,
    repeatCustomerRate: 35.5,
    revenueByMonth: [
      { month: '1月', revenue: 58500.00, profit: 17550.00 },
      { month: '2月', revenue: 62300.00, profit: 18690.00 },
      { month: '3月', revenue: 70500.00, profit: 21150.00 },
      { month: '4月', revenue: 78200.00, profit: 25024.00 },
      { month: '5月', revenue: 87300.00, profit: 27936.00 }
    ],
    kpis: [
      { name: '月度销售目标', target: 85000.00, actual: 87300.00, achievement: 102.71 },
      { name: '客户满意度', target: 4.5, actual: 4.2, achievement: 93.33 },
      { name: '工单完成率', target: 90.00, actual: 87.10, achievement: 96.78 },
      { name: '平均维修时间', target: '1.5天', actual: '1.8天', achievement: 83.33 }
    ]
  };
  
  logger.info(`管理员查询了业绩报表`);
  
  ctx.body = {
    status: 'success',
    data: performanceReport
  };
};

module.exports = {
  getSalesReport,
  getPerformanceReport
};
