const { User, MechanicProfile, WorkOrderMechanic, WorkOrder, Payment, WorkOrderMaterial, Part } = require('../../models');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Op } = require('sequelize');

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
 *                         totalWorkHours:
 *                           type: number
 *                         avgIncomePerOrder:
 *                           type: number
 *                         avgIncomePerHour:
 *                           type: number
 *                         incomeByDay:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               day:
 *                                 type: integer
 *                               income:
 *                                 type: number
 *                               hours:
 *                                 type: number
 *                         topServices:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               service:
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
  try {
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
    
    // 获取技师档案
    const mechanicProfile = await MechanicProfile.findOne({
      where: { mechanic_id: user.id }
    });
    
    if (!mechanicProfile) {
      throw createError.notFound('未找到技师档案');
    }
    
    // 计算月份的开始和结束日期
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    // 获取本月完成的工单和收入
    const completedWorkOrders = await WorkOrderMechanic.findAll({
      where: { mechanic_id: mechanicProfile.mechanic_id },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder',
          where: {
            status: 'done',
            completed_at: {
              [Op.between]: [startDate, endDate]
            }
          },
          include: [
            {
              model: Payment,
              as: 'payments',
              where: { status: 'paid' },
              required: false
            }
          ]
        }
      ],
      attributes: [
        'work_order_id',
        'mechanic_id',
        'hours_worked',
        'created_at'
      ]
    });
    
    // 计算总收入和工时
    const hourlyRate = parseFloat(mechanicProfile.hourly_rate);
    let totalIncome = 0;
    let totalWorkHours = 0;
    
    completedWorkOrders.forEach(wo => {
      const hoursWorked = parseFloat(wo.hours_worked || 0);
      totalWorkHours += hoursWorked;
      totalIncome += hoursWorked * hourlyRate;
    });
    
    // 按日统计收入
    const incomeByDay = [];
    const dailyStats = {};
    
    completedWorkOrders.forEach(wo => {
      const day = new Date(wo.workOrder.completed_at).getDate();
      const hoursWorked = parseFloat(wo.hours_worked || 0);
      const dayIncome = hoursWorked * hourlyRate;
      
      if (!dailyStats[day]) {
        dailyStats[day] = { income: 0, hours: 0 };
      }
      
      dailyStats[day].income += dayIncome;
      dailyStats[day].hours += hoursWorked;
    });
    
    // 填充所有日期
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      incomeByDay.push({
        day,
        income: parseFloat((dailyStats[day]?.income || 0).toFixed(2)),
        hours: parseFloat((dailyStats[day]?.hours || 0).toFixed(1))
      });
    }
    
    // 获取热门服务类型统计
    const serviceStats = await WorkOrder.findAll({
      include: [
        {
          model: WorkOrderMechanic,
          as: 'mechanics',
          where: { mechanic_id: mechanicProfile.mechanic_id }
        }
      ],
      where: {
        status: 'done',
        completed_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['service_type', 'work_order_id'],
      group: ['service_type'],
      order: [[WorkOrder.sequelize.fn('COUNT', WorkOrder.sequelize.col('work_order_id')), 'DESC']],
      limit: 5
    });
    
    const topServices = [];
    for (const service of serviceStats) {
      const serviceOrders = await WorkOrderMechanic.findAll({
        where: { mechanic_id: mechanicProfile.mechanic_id },
        include: [
          {
            model: WorkOrder,
            as: 'workOrder',
            where: {
              service_type: service.service_type,
              status: 'done',
              completed_at: {
                [Op.between]: [startDate, endDate]
              }
            },
            attributes: []
          }
        ],
        attributes: [
          [WorkOrder.sequelize.fn('COUNT', WorkOrder.sequelize.col('WorkOrderMechanic.work_order_id')), 'count'],
          [WorkOrder.sequelize.fn('SUM', WorkOrder.sequelize.col('WorkOrderMechanic.hours_worked')), 'totalHours']
        ],
        raw: true
      });
      
      if (serviceOrders.length > 0 && serviceOrders[0].count > 0) {
        const count = parseInt(serviceOrders[0].count);
        const totalHours = parseFloat(serviceOrders[0].totalHours || 0);
        const income = totalHours * hourlyRate;
        
        topServices.push({
          service: service.service_type || '一般维修',
          count,
          income: parseFloat(income.toFixed(2))
        });
      }
    }
    
    // 获取上月数据进行对比
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59);
    
    const prevMonthWorkOrders = await WorkOrderMechanic.findAll({
      where: { mechanic_id: mechanicProfile.mechanic_id },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder',
          where: {
            status: 'done',
            completed_at: {
              [Op.between]: [prevStartDate, prevEndDate]
            }
          },
          attributes: ['completed_at']
        }
      ],
      attributes: ['hours_worked']
    });
    
    let prevMonthIncome = 0;
    prevMonthWorkOrders.forEach(wo => {
      const hoursWorked = parseFloat(wo.hours_worked || 0);
      prevMonthIncome += hoursWorked * hourlyRate;
    });
    
    // 计算增长百分比
    const percentChange = prevMonthIncome > 0 
      ? ((totalIncome - prevMonthIncome) / prevMonthIncome * 100)
      : (totalIncome > 0 ? 100 : 0);
    
    const completedOrders = completedWorkOrders.length;
    const avgIncomePerOrder = completedOrders > 0 ? totalIncome / completedOrders : 0;
    const avgIncomePerHour = totalWorkHours > 0 ? totalIncome / totalWorkHours : hourlyRate;
    
    const monthlyIncome = {
      month: currentMonth,
      year: currentYear,
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      completedOrders,
      totalWorkHours: parseFloat(totalWorkHours.toFixed(1)),
      avgIncomePerOrder: parseFloat(avgIncomePerOrder.toFixed(2)),
      avgIncomePerHour: parseFloat(avgIncomePerHour.toFixed(2)),
      incomeByDay,
      topServices,
      comparison: {
        previousMonth: parseFloat(prevMonthIncome.toFixed(2)),
        percentChange: parseFloat(percentChange.toFixed(1))
      }
    };
    
    logger.info(`技师 ${user.id} 查询了 ${currentYear}年${currentMonth}月的收入统计`);
    
    ctx.body = {
      status: 'success',
      data: {
        income: monthlyIncome
      }
    };
  } catch (error) {
    logger.error(`获取技师月收入失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('获取技师月收入失败');
  }
};

module.exports = {
  getMonthlyIncome
};
