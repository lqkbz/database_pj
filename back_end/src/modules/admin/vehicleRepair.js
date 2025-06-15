const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminReports');

/**
 * @swagger
 * /api/admin/vehicle-repair:
 *   get:
 *     summary: 获取车辆维修统计报表
 *     description: 获取指定时间范围内的车辆维修统计数据
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
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *         description: 车辆品牌
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
 *                     totalRepairs:
 *                       type: number
 *                     vehicleCount:
 *                       type: number
 *                     averageRepairsPerVehicle:
 *                       type: number
 *                     repairsByMake:
 *                       type: array
 *                     repairsByVehicleAge:
 *                       type: array
 *                     mostCommonIssues:
 *                       type: array
 *                     repairTrend:
 *                       type: array
 *                     seasonalFactors:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getVehicleRepairStats = async (ctx) => {
  const { timeRange = 'month', startDate, endDate, make } = ctx.query;
  
  // 构建查询条件
  const query = { timeRange };
  
  if (startDate) {
    query.startDate = startDate;
  }
  
  if (endDate) {
    query.endDate = endDate;
  }
  
  if (make) {
    query.make = make;
  }
  
  // 从数据库获取统计数据
  // 实际项目中替换为数据库聚合查询
  
  // 车辆维修频率统计
  const vehicleRepairStats = {
    timeRange: query.timeRange,
    startDate: query.startDate || '2023-01-01',
    endDate: query.endDate || '2023-05-31',
    totalRepairs: 248,
    vehicleCount: 156,
    averageRepairsPerVehicle: 1.59,
    repairsByMake: [
      { make: '丰田', count: 67, percentage: 27.02 },
      { make: '本田', count: 52, percentage: 20.97 },
      { make: '大众', count: 43, percentage: 17.34 },
      { make: '日产', count: 29, percentage: 11.69 },
      { make: '奔驰', count: 21, percentage: 8.47 },
      { make: '宝马', count: 18, percentage: 7.26 },
      { make: '其他', count: 18, percentage: 7.26 }
    ],
    repairsByVehicleAge: [
      { ageRange: '0-3年', count: 42, percentage: 16.94 },
      { ageRange: '3-5年', count: 73, percentage: 29.44 },
      { ageRange: '5-8年', count: 88, percentage: 35.48 },
      { ageRange: '8年以上', count: 45, percentage: 18.15 }
    ],
    mostCommonIssues: [
      { issue: '更换机油和滤清器', count: 112, percentage: 45.16 },
      { issue: '刹车系统维修', count: 58, percentage: 23.39 },
      { issue: '发动机故障检修', count: 43, percentage: 17.34 },
      { issue: '空调系统维修', count: 21, percentage: 8.47 },
      { issue: '变速箱维修', count: 14, percentage: 5.65 }
    ],
    repairTrend: [
      { month: '1月', count: 32 },
      { month: '2月', count: 37 },
      { month: '3月', count: 45 },
      { month: '4月', count: 64 },
      { month: '5月', count: 70 }
    ],
    seasonalFactors: {
      winter: { percentage: 22.58, commonIssues: ['电池故障', '暖风系统'] },
      spring: { percentage: 23.79, commonIssues: ['空调系统', '雨刮器'] },
      summer: { percentage: 28.63, commonIssues: ['空调系统', '冷却系统'] },
      autumn: { percentage: 25.00, commonIssues: ['照明系统', '暖风系统'] }
    }
  };
  
  logger.info(`管理员查询了车辆维修统计报表`);
  
  ctx.body = {
    status: 'success',
    data: vehicleRepairStats
  };
};

module.exports = {
  getVehicleRepairStats
};
