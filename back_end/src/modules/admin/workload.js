const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { WorkOrder, WorkOrderMechanic, MechanicProfile, User } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminWorkload');

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
 *                     workloadByTrade:
 *                       type: array
 *                     mechanicSpecialties:
 *                       type: array
 *                     capacityUtilization:
 *                       type: array
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
  
  try {
    // 构建日期范围
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        created_at: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    } else {
      // 默认最近一个月
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      dateFilter = {
        created_at: {
          [Op.between]: [oneMonthAgo, now]
        }
      };
    }

    // 获取该时间段内的工单
    const workOrders = await WorkOrder.findAll({
      where: dateFilter,
      include: [
        {
          model: WorkOrderMechanic,
          as: 'mechanics',
          include: [
            {
              model: MechanicProfile,
              as: 'mechanic',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['user_id', 'name']
                }
              ]
            }
          ],
          required: false
        }
      ],
      attributes: ['order_id', 'status', 'description', 'created_at', 'finished_at']
    });

    // 基本统计
    const totalOrders = workOrders.length;
    const completedOrders = workOrders.filter(order => order.status === 'done').length;
    const inProgressOrders = workOrders.filter(order => order.status === 'in_progress').length;

    // 按工种统计工单
    const tradeStats = {};
    const mechanicWorkStats = {};

    workOrders.forEach(order => {
      if (order.mechanics && order.mechanics.length > 0) {
        order.mechanics.forEach(mechanic => {
          const trade = mechanic.mechanic.trade;
          const mechanicId = mechanic.mechanic.user.user_id;
          const mechanicName = mechanic.mechanic.user.name;
          
          // 工种统计
          if (!tradeStats[trade]) {
            tradeStats[trade] = {
              count: 0,
              totalHours: 0,
              completedCount: 0
            };
          }
          
          tradeStats[trade].count++;
          tradeStats[trade].totalHours += parseFloat(mechanic.hours_worked || 0);
          
          if (order.status === 'done') {
            tradeStats[trade].completedCount++;
          }
          
          // 技师工作统计
          if (!mechanicWorkStats[mechanicId]) {
            mechanicWorkStats[mechanicId] = {
              mechanicId,
              name: mechanicName,
              trade,
              orderCount: 0,
              completedCount: 0,
              totalHours: 0,
              ordersByType: {}
            };
          }
          
          mechanicWorkStats[mechanicId].orderCount++;
          mechanicWorkStats[mechanicId].totalHours += parseFloat(mechanic.hours_worked || 0);
          
          if (order.status === 'done') {
            mechanicWorkStats[mechanicId].completedCount++;
          }
          
          // 按工单描述分类统计
          const description = order.description.toLowerCase();
          let orderType = '其他维修';
          
          if (description.includes('机油') || description.includes('保养')) {
            orderType = '常规保养';
          } else if (description.includes('发动机') || description.includes('引擎')) {
            orderType = '发动机维修';
          } else if (description.includes('电子') || description.includes('电路')) {
            orderType = '电子系统';
          } else if (description.includes('底盘') || description.includes('悬挂')) {
            orderType = '底盘调校';
          } else if (description.includes('变速箱')) {
            orderType = '变速箱维修';
          }
          
          if (!mechanicWorkStats[mechanicId].ordersByType[orderType]) {
            mechanicWorkStats[mechanicId].ordersByType[orderType] = 0;
          }
          mechanicWorkStats[mechanicId].ordersByType[orderType]++;
        });
      }
    });

    // 工种工作量分布
    const workloadByTrade = Object.entries(tradeStats).map(([trade, stats]) => ({
      tradeType: trade,
      count: stats.count,
      percentage: totalOrders > 0 ? parseFloat((stats.count / totalOrders * 100).toFixed(2)) : 0,
      avgTime: stats.count > 0 ? `${(stats.totalHours / stats.count).toFixed(1)}小时` : '0小时'
    }));

    // 技师专业分工
    const mechanicSpecialties = Object.values(mechanicWorkStats)
      .filter(mechanic => mechanic.orderCount > 0)
      .map(mechanic => ({
        mechanicId: mechanic.mechanicId,
        name: mechanic.name,
        specialties: [mechanic.trade],
        orderCount: mechanic.orderCount,
        completedCount: mechanic.completedCount,
        totalHours: parseFloat(mechanic.totalHours.toFixed(1)),
        ordersByType: Object.entries(mechanic.ordersByType).map(([type, count]) => ({
          type,
          count
        }))
      }));

    // 获取所有技师用于计算容量利用率
    const allMechanics = await User.findAll({
      where: { role: 'mechanic' },
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          required: true
        }
      ]
    });

    // 容量利用率（假设每个技师月工作能力为160小时）
    const monthlyCapacity = 160;
    const capacityUtilization = allMechanics.map(mechanic => {
      const mechanicId = mechanic.user_id;
      const workStats = mechanicWorkStats[mechanicId];
      const actualHours = workStats ? workStats.totalHours : 0;
      const utilization = (actualHours / monthlyCapacity * 100).toFixed(2);
      
      return {
        mechanicId,
        name: mechanic.name,
        capacity: monthlyCapacity,
        actualHours: parseFloat(actualHours.toFixed(1)),
        utilization: parseFloat(utilization)
      };
    });

    // 工作量趋势分析（按月统计）
    const monthlyWorkload = {};
    workOrders.forEach(order => {
      const monthKey = new Date(order.created_at).toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyWorkload[monthKey]) {
        monthlyWorkload[monthKey] = {
          count: 0,
          totalHours: 0
        };
      }
      
      monthlyWorkload[monthKey].count++;
      
      if (order.mechanics && order.mechanics.length > 0) {
        order.mechanics.forEach(mechanic => {
          monthlyWorkload[monthKey].totalHours += parseFloat(mechanic.hours_worked || 0);
        });
      }
    });

    const workloadTrend = Object.entries(monthlyWorkload)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, stats]) => {
        const totalMechanics = allMechanics.length;
        const monthlyTotalCapacity = totalMechanics * monthlyCapacity;
        const utilization = monthlyTotalCapacity > 0 ? (stats.totalHours / monthlyTotalCapacity * 100) : 0;
        
        return {
          month: new Date(month + '-01').toLocaleDateString('zh-CN', { month: 'long' }),
          count: stats.count,
          utilization: parseFloat(utilization.toFixed(1))
        };
      });

    // 工种工作量统计
    const tradeWorkloadStats = {
      timeRange,
      startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      totalOrders,
      completedOrders,
      inProgressOrders,
      workloadByTrade,
      mechanicSpecialties,
      capacityUtilization,
      workloadTrend
  };
  
  logger.info(`管理员查询了工种工作量统计报表`);
  
  ctx.body = {
    status: 'success',
    data: tradeWorkloadStats
  };
  } catch (error) {
    logger.error('获取工种工作量统计失败:', error);
    throw createError.internal('获取工种工作量统计失败');
  }
};

module.exports = {
  getTradeWorkloadStats
};
