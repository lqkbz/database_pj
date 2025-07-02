const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { WorkOrder, User, Vehicle, WorkOrderMechanic, MechanicProfile } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminOrders');

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
 *                     ordersByMechanic:
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
  const { overdueDays = 3 } = ctx.query;
  
  try {
    // 计算逾期日期
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - parseInt(overdueDays));
    
    // 获取所有未完成工单
    const activeOrders = await WorkOrder.findAll({
      where: {
        status: {
          [Op.in]: ['pending', 'assigned', 'in_progress']
        }
      },
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plate_no', 'make', 'model'],
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['user_id', 'name']
            }
          ]
        },
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
      attributes: ['order_id', 'status', 'description', 'created_at'],
      order: [['created_at', 'ASC']]
    });

    // 统计状态分布
    const statusCounts = activeOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const totalActiveOrders = activeOrders.length;
    const statusBreakdown = {
      pending: {
        count: statusCounts.pending || 0,
        percentage: totalActiveOrders > 0 ? ((statusCounts.pending || 0) / totalActiveOrders * 100).toFixed(2) : 0
      },
      assigned: {
        count: statusCounts.assigned || 0,
        percentage: totalActiveOrders > 0 ? ((statusCounts.assigned || 0) / totalActiveOrders * 100).toFixed(2) : 0
      },
      in_progress: {
        count: statusCounts.in_progress || 0,
        percentage: totalActiveOrders > 0 ? ((statusCounts.in_progress || 0) / totalActiveOrders * 100).toFixed(2) : 0
      }
    };

    // 统计逾期工单
    const overdueOrders = activeOrders.filter(order => new Date(order.created_at) < overdueDate);
    const overdueRate = totalActiveOrders > 0 ? (overdueOrders.length / totalActiveOrders * 100).toFixed(2) : 0;

    // 计算平均等待时间
    const now = new Date();
    const waitTimes = {
      pending: [],
      assigned: [],
      in_progress: []
    };

    activeOrders.forEach(order => {
      const waitDays = Math.floor((now - new Date(order.created_at)) / (1000 * 60 * 60 * 24));
      waitTimes[order.status].push(waitDays);
    });

    const averageWaitTime = {
      pending: waitTimes.pending.length > 0 
        ? `${(waitTimes.pending.reduce((a, b) => a + b, 0) / waitTimes.pending.length).toFixed(1)}天`
        : '0天',
      assigned: waitTimes.assigned.length > 0 
        ? `${(waitTimes.assigned.reduce((a, b) => a + b, 0) / waitTimes.assigned.length).toFixed(1)}天`
        : '0天',
      in_progress: waitTimes.in_progress.length > 0 
        ? `${(waitTimes.in_progress.reduce((a, b) => a + b, 0) / waitTimes.in_progress.length).toFixed(1)}天`
        : '0天'
    };

    // 按技师统计工单
    const mechanicStats = {};
    activeOrders.forEach(order => {
      if (order.mechanics && order.mechanics.length > 0) {
        order.mechanics.forEach(mechanic => {
          const mechanicId = mechanic.mechanic.user.user_id;
          const mechanicName = mechanic.mechanic.user.name;
          
          if (!mechanicStats[mechanicId]) {
            mechanicStats[mechanicId] = {
              mechanicId,
              name: mechanicName,
              count: 0,
              overdue: 0
            };
          }
          
          mechanicStats[mechanicId].count++;
          if (new Date(order.created_at) < overdueDate) {
            mechanicStats[mechanicId].overdue++;
          }
        });
      }
    });

    const ordersByMechanic = Object.values(mechanicStats);

    // 获取最逾期的工单（前5个）
    const mostOverdueOrders = overdueOrders
      .map(order => {
        const days = Math.floor((now - new Date(order.created_at)) / (1000 * 60 * 60 * 24));
        const mechanic = order.mechanics && order.mechanics.length > 0 
          ? order.mechanics[0].mechanic.user.name 
          : '未分配';
        
        return {
          workOrderId: order.order_id,
          days,
          customer: order.vehicle.owner.name,
          vehicle: `${order.vehicle.make} ${order.vehicle.model}`,
          licensePlate: order.vehicle.plate_no,
          description: order.description,
          mechanic,
          status: order.status,
          createdAt: order.created_at
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);

    // 未完成工单统计
    const unfinishedOrdersStats = {
      totalActiveOrders,
      statusBreakdown,
      overdueOrders: overdueOrders.length,
      overdueRate: parseFloat(overdueRate),
      averageWaitTime,
      ordersByMechanic,
      mostOverdueOrders
  };
  
  logger.info(`管理员查询了未完成工单统计报表`);
  
  ctx.body = {
    status: 'success',
    data: unfinishedOrdersStats
  };
  } catch (error) {
    logger.error('获取未完成工单统计失败:', error);
    throw createError.internal('获取未完成工单统计失败');
  }
};

module.exports = {
  getUnfinishedOrdersStats
};
