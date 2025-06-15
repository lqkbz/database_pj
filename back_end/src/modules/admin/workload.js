const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminReports');

/**
 * @swagger
 * /api/admin/trade-workload:
 *   get:
 *     summary: 获取工种工作量统计报表
 *     description: 获取指定时间范围内的工种工作量统计数据
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
 *                     totalOrders:
 *                       type: number
 *                     completedOrders:
 *                       type: number
 *                     inProgressOrders:
 *                       type: number
 *                     workloadByTradeType:
 *                       type: array
 *                     mechanicSpecialties:
 *                       type: array
 *                     capacityUtilization:
 *                       type: array
 *                     highDemandSkills:
 *                       type: array
 *                     schedulingEfficiency:
 *                       type: object
 *                     workloadTrend:
 *                       type: array
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getTradeWorkloadStats = async (ctx) => {
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
  
  // 工种工作量统计
  const tradeWorkloadStats = {
    timeRange: query.timeRange,
    startDate: query.startDate || '2023-01-01',
    endDate: query.endDate || '2023-05-31',
    totalOrders: 248,
    completedOrders: 216,
    inProgressOrders: 32,
    workloadByTradeType: [
      { tradeType: '发动机维修', count: 58, percentage: 23.39, avgTime: '4.5小时' },
      { tradeType: '常规保养', count: 78, percentage: 31.45, avgTime: '1.8小时' },
      { tradeType: '电子系统', count: 42, percentage: 16.94, avgTime: '3.2小时' },
      { tradeType: '底盘调校', count: 36, percentage: 14.52, avgTime: '2.5小时' },
      { tradeType: '变速箱维修', count: 21, percentage: 8.47, avgTime: '5.2小时' },
      { tradeType: '其他维修', count: 13, percentage: 5.24, avgTime: '2.8小时' }
    ],
    mechanicSpecialties: [
      { 
        mechanicId: 'mech1', 
        name: '李师傅', 
        specialties: ['发动机维修', '电子系统', '底盘调校'], 
        orderCount: 55,
        ordersByType: [
          { type: '发动机维修', count: 22 },
          { type: '电子系统', count: 18 },
          { type: '底盘调校', count: 15 }
        ]
      },
      { 
        mechanicId: 'mech2', 
        name: '王师傅', 
        specialties: ['钣金喷漆', '车身维修', '空调系统'], 
        orderCount: 42,
        ordersByType: [
          { type: '钣金喷漆', count: 18 },
          { type: '车身维修', count: 14 },
          { type: '空调系统', count: 10 }
        ]
      },
      { 
        mechanicId: 'mech3', 
        name: '张师傅', 
        specialties: ['变速箱维修', '离合器更换', '悬挂系统'], 
        orderCount: 38,
        ordersByType: [
          { type: '变速箱维修', count: 16 },
          { type: '离合器更换', count: 14 },
          { type: '悬挂系统', count: 8 }
        ]
      }
    ],
    capacityUtilization: [
      { mechanicId: 'mech1', name: '李师傅', capacity: 60, utilization: 91.67 },
      { mechanicId: 'mech2', name: '王师傅', capacity: 55, utilization: 76.36 },
      { mechanicId: 'mech3', name: '张师傅', capacity: 55, utilization: 69.09 },
      { mechanicId: 'mech4', name: '赵师傅', capacity: 50, utilization: 82.00 },
      { mechanicId: 'mech5', name: '刘师傅', capacity: 50, utilization: 86.00 }
    ],
    highDemandSkills: [
      { skill: '电子系统诊断', demandScore: 8.7, availableMechanics: 2 },
      { skill: '混合动力系统维修', demandScore: 8.3, availableMechanics: 1 },
      { skill: '自动变速箱维修', demandScore: 7.9, availableMechanics: 2 },
      { skill: '涡轮增压器维修', demandScore: 7.6, availableMechanics: 1 }
    ],
    schedulingEfficiency: {
      averageWaitTime: '1.8天',
      reschedulingRate: 12.5,
      idleTimePercentage: 8.3,
      peakHours: ['上午9点-11点', '下午2点-4点'],
      recommendedHiring: [
        { specialty: '电子系统诊断', count: 1 },
        { specialty: '混合动力系统维修', count: 1 }
      ]
    },
    workloadTrend: [
      { month: '1月', count: 32, utilization: 68.5 },
      { month: '2月', count: 37, utilization: 72.3 },
      { month: '3月', count: 45, utilization: 78.6 },
      { month: '4月', count: 64, utilization: 86.2 },
      { month: '5月', count: 70, utilization: 89.7 }
    ]
  };
  
  logger.info(`管理员查询了工种工作量统计报表`);
  
  ctx.body = {
    status: 'success',
    data: tradeWorkloadStats
  };
};

module.exports = {
  getTradeWorkloadStats
};
