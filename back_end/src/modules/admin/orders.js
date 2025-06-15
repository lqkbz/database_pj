const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminReports');

/**
 * @swagger
 * /api/admin/unfinished-orders:
 *   get:
 *     summary: 获取未完成工单统计报表
 *     description: 获取当前未完成工单的统计数据和分析
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: overdueDays
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 筛选超过指定天数的逾期工单
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
 *                     totalActiveOrders:
 *                       type: integer
 *                     statusBreakdown:
 *                       type: object
 *                     overdueOrders:
 *                       type: integer
 *                     overdueRate:
 *                       type: number
 *                     averageWaitTime:
 *                       type: object
 *                     ordersByPriority:
 *                       type: array
 *                     ordersByMechanic:
 *                       type: array
 *                     ordersByServiceType:
 *                       type: array
 *                     bottlenecks:
 *                       type: array
 *                     mostOverdueOrders:
 *                       type: array
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getUnfinishedOrdersStats = async (ctx) => {
  const { overdueDays } = ctx.query;
  
  // 构建查询条件
  const query = {};
  if (overdueDays) {
    query.overdueDays = parseInt(overdueDays);
  }
  
  // 从数据库获取统计数据
  // 实际项目中替换为数据库聚合查询
  
  // 未完成工单统计
  const unfinishedOrdersStats = {
    totalActiveOrders: 32,
    statusBreakdown: {
      pending: { count: 8, percentage: 25.00 },
      accepted: { count: 12, percentage: 37.50 },
      in_progress: { count: 12, percentage: 37.50 }
    },
    overdueOrders: 7,
    overdueRate: 21.88,
    averageWaitTime: {
      pending: '2.3天',
      accepted: '1.5天',
      in_progress: '3.2天'
    },
    ordersByPriority: [
      { priority: 'low', count: 5, percentage: 15.63 },
      { priority: 'normal', count: 20, percentage: 62.50 },
      { priority: 'high', count: 5, percentage: 15.63 },
      { priority: 'urgent', count: 2, percentage: 6.25 }
    ],
    ordersByMechanic: [
      { mechanicId: 'mech1', name: '李师傅', count: 8, overdue: 1 },
      { mechanicId: 'mech2', name: '王师傅', count: 7, overdue: 2 },
      { mechanicId: 'mech3', name: '张师傅', count: 6, overdue: 1 },
      { mechanicId: 'mech4', name: '赵师傅', count: 5, overdue: 2 },
      { mechanicId: 'mech5', name: '刘师傅', count: 6, overdue: 1 }
    ],
    ordersByServiceType: [
      { serviceType: '发动机维修', count: 9, overdue: 3 },
      { serviceType: '常规保养', count: 8, overdue: 0 },
      { serviceType: '电子系统', count: 7, overdue: 2 },
      { serviceType: '底盘调校', count: 5, overdue: 1 },
      { serviceType: '变速箱维修', count: 3, overdue: 1 }
    ],
    bottlenecks: [
      { reason: '零部件缺货', count: 4, percentage: 57.14 },
      { reason: '技师工作量过大', count: 2, percentage: 28.57 },
      { reason: '特殊工具不足', count: 1, percentage: 14.29 }
    ],
    mostOverdueOrders: [
      {
        workOrderId: 'wo28',
        days: 5,
        customer: '张三',
        vehicle: '丰田卡罗拉',
        description: '变速箱异响',
        mechanic: '王师傅',
        status: 'in_progress',
        reason: '等待特殊零件'
      },
      {
        workOrderId: 'wo31',
        days: 4,
        customer: '李四',
        vehicle: '本田思域',
        description: '电子系统故障',
        mechanic: '赵师傅',
        status: 'accepted',
        reason: '技师忙于其他紧急订单'
      },
      {
        workOrderId: 'wo33',
        days: 3,
        customer: '王五',
        vehicle: '大众帕萨特',
        description: '发动机故障灯亮',
        mechanic: '李师傅',
        status: 'in_progress',
        reason: '诊断复杂问题'
      }
    ]
  };
  
  logger.info(`管理员查询了未完成工单统计报表`);
  
  ctx.body = {
    status: 'success',
    data: unfinishedOrdersStats
  };
};

module.exports = {
  getUnfinishedOrdersStats
};
