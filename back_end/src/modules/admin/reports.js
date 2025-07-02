const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Payment, WorkOrder, User, Vehicle, WorkOrderMechanic, MechanicProfile, Feedback } = require('../../models');
const { Op } = require('sequelize');

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

    // 获取支付记录（已完成的）
    const payments = await Payment.findAll({
      where: {
        ...dateFilter,
        status: 'completed'
      },
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['user_id', 'name']
        },
        {
          model: WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description', 'created_at'],
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
          required: false
        }
      ],
      order: [['created_at', 'ASC']]
    });

    // 计算总销售额和工单数
    const totalSales = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const totalOrders = payments.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // 按服务类型分组销售（基于工单描述关键词）
    const salesByCategory = {};
    payments.forEach(payment => {
      if (payment.workOrder) {
        const description = payment.workOrder.description.toLowerCase();
        let category = '其他维修';
        
        if (description.includes('机油') || description.includes('保养')) {
          category = '常规保养';
        } else if (description.includes('发动机') || description.includes('引擎')) {
          category = '发动机维修';
        } else if (description.includes('电子') || description.includes('电路')) {
          category = '电子系统';
        } else if (description.includes('底盘') || description.includes('悬挂')) {
          category = '底盘调校';
        }
        
        if (!salesByCategory[category]) {
          salesByCategory[category] = 0;
        }
        salesByCategory[category] += parseFloat(payment.amount);
      }
    });

    const salesByCategoryArray = Object.entries(salesByCategory).map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toFixed(2)),
      percentage: totalSales > 0 ? parseFloat((amount / totalSales * 100).toFixed(2)) : 0
    }));

    // 按月份统计销售额
    const salesByMonth = {};
    payments.forEach(payment => {
      const monthKey = new Date(payment.created_at).toISOString().slice(0, 7); // YYYY-MM
      if (!salesByMonth[monthKey]) {
        salesByMonth[monthKey] = 0;
      }
      salesByMonth[monthKey] += parseFloat(payment.amount);
    });

    const salesByMonthArray = Object.entries(salesByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('zh-CN', { month: 'long' }),
        amount: parseFloat(amount.toFixed(2))
      }));

    // 统计top客户
    const customerStats = {};
    payments.forEach(payment => {
      const customerId = payment.customer.user_id;
      const customerName = payment.customer.name;
      
      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          customerId,
          name: customerName,
          totalSpent: 0,
          orderCount: 0
        };
      }
      
      customerStats[customerId].totalSpent += parseFloat(payment.amount);
      customerStats[customerId].orderCount++;
    });

    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map(customer => ({
        ...customer,
        totalSpent: parseFloat(customer.totalSpent.toFixed(2))
      }));

    // 统计top技师
    const mechanicStats = {};
    payments.forEach(payment => {
      if (payment.workOrder && payment.workOrder.mechanics) {
        payment.workOrder.mechanics.forEach(mechanic => {
          const mechanicId = mechanic.mechanic.user.user_id;
          const mechanicName = mechanic.mechanic.user.name;
          
          if (!mechanicStats[mechanicId]) {
            mechanicStats[mechanicId] = {
              mechanicId,
              name: mechanicName,
              totalSales: 0,
              orderCount: 0
            };
          }
          
          mechanicStats[mechanicId].totalSales += parseFloat(payment.amount);
          mechanicStats[mechanicId].orderCount++;
        });
      }
    });

    const topMechanics = Object.values(mechanicStats)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5)
      .map(mechanic => ({
        ...mechanic,
        totalSales: parseFloat(mechanic.totalSales.toFixed(2))
      }));

    // 销售报表数据
    const salesReport = {
      timeRange,
      startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalOrders,
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      salesByCategory: salesByCategoryArray,
      salesByMonth: salesByMonthArray,
      topCustomers,
      topMechanics
    };
    
    logger.info(`管理员查询了销售报表`);
    
    ctx.body = {
      status: 'success',
      data: salesReport
    };
  } catch (error) {
    logger.error('获取销售报表失败:', error);
    throw createError.internal('获取销售报表失败');
  }
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
          model: Payment,
          as: 'payment',
          attributes: ['amount', 'status']
        }
      ],
      attributes: ['order_id', 'status', 'created_at', 'finished_at']
    });

    // 获取支付记录
    const completedPayments = await Payment.findAll({
      where: {
        ...dateFilter,
        status: 'completed'
      },
      attributes: ['amount', 'created_at']
    });

    // 计算基本指标
    const totalRevenue = completedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const totalCost = totalRevenue * 0.7; // 假设成本为收入的70%
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

    // 计算工单完成率
    const totalWorkOrders = workOrders.length;
    const completedWorkOrders = workOrders.filter(order => order.status === 'done').length;
    const orderCompletionRate = totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders * 100) : 0;

    // 计算平均完成时间
    const completedOrdersWithTime = workOrders.filter(order => order.status === 'done' && order.finished_at);
    let averageCompletionTime = '0天';
    if (completedOrdersWithTime.length > 0) {
      const totalDays = completedOrdersWithTime.reduce((sum, order) => {
        const days = Math.floor((new Date(order.finished_at) - new Date(order.created_at)) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      averageCompletionTime = `${(totalDays / completedOrdersWithTime.length).toFixed(1)}天`;
    }

    // 获取客户满意度
    const feedbacks = await Feedback.findAll({
      where: {
        ...dateFilter,
        type: 'rating'
      },
      attributes: ['rating']
    });

    const customerSatisfaction = feedbacks.length > 0 
      ? feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbacks.length 
      : 0;

    // 计算回头客率
    const customers = await User.findAll({
      include: [
        {
          model: Payment,
          as: 'payments',
          where: dateFilter,
          attributes: ['payment_id']
        }
      ],
      attributes: ['user_id']
    });

    const repeatCustomers = customers.filter(customer => customer.payments.length > 1);
    const repeatCustomerRate = customers.length > 0 ? (repeatCustomers.length / customers.length * 100) : 0;

    // 按月统计收入和利润
    const monthlyStats = {};
    completedPayments.forEach(payment => {
      const monthKey = new Date(payment.created_at).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          revenue: 0,
          profit: 0
        };
      }
      const revenue = parseFloat(payment.amount);
      const profit = revenue * 0.3; // 假设利润率为30%
      
      monthlyStats[monthKey].revenue += revenue;
      monthlyStats[monthKey].profit += profit;
    });

    const revenueByMonth = Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, stats]) => ({
        month: new Date(month + '-01').toLocaleDateString('zh-CN', { month: 'long' }),
        revenue: parseFloat(stats.revenue.toFixed(2)),
        profit: parseFloat(stats.profit.toFixed(2))
      }));

    // KPI目标（实际项目中可能从配置表获取）
    const monthlyTarget = 85000;
    const currentMonthRevenue = revenueByMonth.length > 0 ? revenueByMonth[revenueByMonth.length - 1].revenue : 0;
    
    const kpis = [
      {
        name: '月度销售目标',
        target: monthlyTarget,
        actual: currentMonthRevenue,
        achievement: monthlyTarget > 0 ? parseFloat((currentMonthRevenue / monthlyTarget * 100).toFixed(2)) : 0
      },
      {
        name: '客户满意度',
        target: 4.5,
        actual: parseFloat(customerSatisfaction.toFixed(1)),
        achievement: parseFloat((customerSatisfaction / 4.5 * 100).toFixed(2))
      },
      {
        name: '工单完成率',
        target: 90.0,
        actual: parseFloat(orderCompletionRate.toFixed(1)),
        achievement: parseFloat((orderCompletionRate / 90 * 100).toFixed(2))
      },
      {
        name: '平均维修时间',
        target: '1.5天',
        actual: averageCompletionTime,
        achievement: parseFloat(averageCompletionTime) <= 1.5 ? 100 : parseFloat((1.5 / parseFloat(averageCompletionTime) * 100).toFixed(2))
      }
    ];

    // 业绩报表数据
    const performanceReport = {
      timeRange,
      startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      grossMargin: parseFloat(grossMargin.toFixed(2)),
      orderCompletionRate: parseFloat(orderCompletionRate.toFixed(1)),
      averageCompletionTime,
      customerSatisfaction: parseFloat(customerSatisfaction.toFixed(1)),
      repeatCustomerRate: parseFloat(repeatCustomerRate.toFixed(1)),
      revenueByMonth,
      kpis
    };
    
    logger.info(`管理员查询了业绩报表`);
    
    ctx.body = {
      status: 'success',
      data: performanceReport
    };
  } catch (error) {
    logger.error('获取业绩报表失败:', error);
    throw createError.internal('获取业绩报表失败');
  }
};

module.exports = {
  getSalesReport,
  getPerformanceReport
};
