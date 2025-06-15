const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminReports');

/**
 * @swagger
 * /api/admin/cost-structure:
 *   get:
 *     summary: 获取成本结构分析报表
 *     description: 获取指定时间范围内的成本结构分析统计数据
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
 *                   properties:
 *                     timeRange:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *                     totalRevenue:
 *                       type: number
 *                     totalCost:
 *                       type: number
 *                     grossProfit:
 *                       type: number
 *                     grossMargin:
 *                       type: number
 *                     costBreakdown:
 *                       type: object
 *                     partsCostByCategory:
 *                       type: array
 *                     laborCostByType:
 *                       type: array
 *                     profitabilityByServiceType:
 *                       type: array
 *                     costTrend:
 *                       type: array
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getCostStructureStats = async (ctx) => {
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
  
  // 成本结构分析
  const costStructureStats = {
    timeRange: query.timeRange,
    startDate: query.startDate || '2023-01-01',
    endDate: query.endDate || '2023-05-31',
    totalRevenue: 356800.00,
    totalCost: 246500.00,
    grossProfit: 110300.00,
    grossMargin: 30.91,
    costBreakdown: {
      labor: { amount: 132400.00, percentage: 53.71 },
      parts: { amount: 98800.00, percentage: 40.08 },
      overhead: { amount: 15300.00, percentage: 6.21 }
    },
    partsCostByCategory: [
      { category: '滤清器', amount: 25600.00, percentage: 25.91 },
      { category: '润滑油', amount: 22400.00, percentage: 22.67 },
      { category: '刹车系统', amount: 18900.00, percentage: 19.13 },
      { category: '电子部件', amount: 14500.00, percentage: 14.68 },
      { category: '冷却系统', amount: 8200.00, percentage: 8.30 },
      { category: '其他', amount: 9200.00, percentage: 9.31 }
    ],
    laborCostByType: [
      { type: '常规保养', amount: 32600.00, percentage: 24.62 },
      { type: '发动机维修', amount: 29800.00, percentage: 22.51 },
      { type: '电子系统', amount: 25300.00, percentage: 19.11 },
      { type: '底盘调校', amount: 21400.00, percentage: 16.16 },
      { type: '其他维修', amount: 23300.00, percentage: 17.60 }
    ],
    profitabilityByServiceType: [
      { type: '常规保养', revenue: 78500.00, cost: 48600.00, margin: 38.09 },
      { type: '发动机维修', revenue: 98200.00, cost: 72400.00, margin: 26.27 },
      { type: '电子系统', revenue: 65300.00, cost: 42500.00, margin: 34.92 },
      { type: '底盘调校', revenue: 58600.00, cost: 41800.00, margin: 28.67 },
      { type: '其他维修', revenue: 56200.00, cost: 41200.00, margin: 26.69 }
    ],
    costTrend: [
      { month: '1月', labor: 22500, parts: 16800, overhead: 2800 },
      { month: '2月', labor: 24300, parts: 18400, overhead: 3100 },
      { month: '3月', labor: 26800, parts: 19600, overhead: 3000 },
      { month: '4月', labor: 28600, parts: 21500, overhead: 3200 },
      { month: '5月', labor: 30200, parts: 22500, overhead: 3200 }
    ]
  };
  
  logger.info(`管理员查询了成本结构分析报表`);
  
  ctx.body = {
    status: 'success',
    data: costStructureStats
  };
};

module.exports = {
  getCostStructureStats
};
