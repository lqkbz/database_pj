const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Payment, WorkOrder, User, Vehicle, WorkOrderMechanic, MechanicProfile } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminFinance');

/**
 * @swagger
 * /api/admin/finance/payments:
 *   get:
 *     summary: 获取支付记录列表
 *     description: 获取系统中的支付记录，支持按状态、日期、客户等过滤
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *         description: 每页记录数
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         description: 支付状态
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
 *         name: customer
 *         schema:
 *           type: string
 *         description: 客户ID或姓名
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [service, deposit, refund]
 *         description: 支付类型
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
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalAmount:
 *                           type: number
 *                         refundAmount:
 *                           type: number
 *                         pendingAmount:
 *                           type: number
 *                         completedCount:
 *                           type: integer
 *                         pendingCount:
 *                           type: integer
 *                         refundCount:
 *                           type: integer
 *                     pagination:
 *                       type: object
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getPayments = async (ctx) => {
  const { page = 1, limit = 10, status, startDate, endDate, customer, type } = ctx.query;
  
  try {
    // 构建查询条件
    const whereClause = {};
    const userWhereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.created_at = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.created_at = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    if (customer) {
      // 支持按用户ID或姓名搜索
      if (isNaN(customer)) {
        userWhereClause.name = { [Op.like]: `%${customer}%` };
      } else {
        whereClause.user_id = customer;
      }
    }
    
    // 查询支付记录
    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'customer',
          where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined,
          attributes: ['user_id', 'name'],
          required: true
        },
        {
          model: WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description'],
          include: [
            {
              model: Vehicle,
              as: 'vehicle',
              attributes: ['plate_no']
            }
          ],
          required: false
        }
      ],
      attributes: ['payment_id', 'amount', 'payment_method', 'status', 'type', 'transaction_id', 'created_at', 'processed_at', 'note'],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    // 处理数据
    const processedPayments = payments.map(payment => ({
      id: payment.payment_id,
      amount: parseFloat(payment.amount),
      method: payment.payment_method,
      status: payment.status,
      type: payment.type,
      transactionId: payment.transaction_id,
      createdAt: payment.created_at,
      processedAt: payment.processed_at,
      note: payment.note,
      customer: {
        id: payment.customer.user_id,
        name: payment.customer.name
      },
      workOrder: payment.workOrder ? {
        id: payment.workOrder.order_id,
        description: payment.workOrder.description,
        vehiclePlate: payment.workOrder.vehicle?.plate_no
      } : null
    }));

    // 计算统计信息
    const allPayments = await Payment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'customer',
          where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined,
          attributes: [],
          required: true
        }
      ],
      attributes: ['amount', 'status', 'type']
    });

    const summary = {
      totalAmount: allPayments
        .filter(p => p.status === 'completed' && p.type !== 'refund')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0),
      refundAmount: allPayments
        .filter(p => p.type === 'refund' && p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0),
      pendingAmount: allPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0),
      completedCount: allPayments.filter(p => p.status === 'completed').length,
      pendingCount: allPayments.filter(p => p.status === 'pending').length,
      refundCount: allPayments.filter(p => p.type === 'refund').length
    };
    
    logger.info(`管理员查询了支付记录，返回 ${payments.length} 条记录`);
    
    ctx.body = {
      status: 'success',
      data: {
        payments: processedPayments,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取支付记录失败:', error);
    throw createError.internal('获取支付记录失败');
  }
};

/**
 * @swagger
 * /api/admin/payroll:
 *   get:
 *     summary: 获取工资单列表
 *     description: 获取系统中的工资单记录，支持按月份、年份、技师和状态过滤
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *         description: 每页记录数
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: 月份（1-12）
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: 年份
 *       - in: query
 *         name: mechanic
 *         schema:
 *           type: string
 *         description: 技师ID或姓名
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
 *                     payroll:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPayroll:
 *                           type: number
 *                         averagePayroll:
 *                           type: number
 *                         totalBasicSalary:
 *                           type: number
 *                         totalCommission:
 *                           type: number
 *                         totalBonuses:
 *                           type: number
 *                         totalDeductions:
 *                           type: number
 *                         paidCount:
 *                           type: integer
 *                         pendingCount:
 *                           type: integer
 *                     pagination:
 *                       type: object
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getPayroll = async (ctx) => {
  const { page = 1, limit = 10, month, year, mechanic } = ctx.query;
  
  try {
    // 默认为当前月份
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();
    
    // 计算月份的开始和结束日期
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    
    // 构建查询条件
    const userWhereClause = { role: 'mechanic' };
    
    if (mechanic) {
      if (isNaN(mechanic)) {
        userWhereClause.name = { [Op.like]: `%${mechanic}%` };
      } else {
        userWhereClause.user_id = mechanic;
      }
    }
    
    // 查询技师及其当月工作统计
    const { count, rows: mechanics } = await User.findAndCountAll({
      where: userWhereClause,
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          required: true,
          attributes: ['hourly_rate', 'hire_date', 'trade']
        },
        {
          model: WorkOrderMechanic,
          as: 'workOrderMechanics',
          where: {
            created_at: {
              [Op.between]: [startDate, endDate]
            },
            status: 'completed'
          },
          attributes: ['hours_worked'],
          required: false
        }
      ],
      attributes: ['user_id', 'name', 'created_at'],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['name', 'ASC']]
    });

    // 处理工资数据
    const payrollRecords = mechanics.map(mechanic => {
      const totalHours = mechanic.workOrderMechanics.reduce((sum, wom) => sum + (parseFloat(wom.hours_worked) || 0), 0);
      const hourlyRate = parseFloat(mechanic.mechanicProfile.hourly_rate) || 0;
      const basicSalary = 3000; // 基础工资，实际项目中可能从配置中获取
      const commission = totalHours * hourlyRate;
      const bonuses = 0; // 奖金，实际项目中根据业务逻辑计算
      const deductions = 0; // 扣款，实际项目中根据业务逻辑计算
      const totalSalary = basicSalary + commission + bonuses - deductions;

      return {
        id: mechanic.user_id,
        name: mechanic.name,
        trade: mechanic.mechanicProfile.trade,
        month: targetMonth,
        year: targetYear,
        basicSalary,
        commission,
        bonuses,
        deductions,
        totalSalary,
        hoursWorked: totalHours,
        completedOrders: mechanic.workOrderMechanics.length,
        hourlyRate,
        hireDate: mechanic.mechanicProfile.hire_date
      };
    });

    // 计算统计信息
    const summary = {
      totalPayroll: payrollRecords.reduce((sum, record) => sum + record.totalSalary, 0),
      averagePayroll: payrollRecords.length > 0 ? payrollRecords.reduce((sum, record) => sum + record.totalSalary, 0) / payrollRecords.length : 0,
      totalBasicSalary: payrollRecords.reduce((sum, record) => sum + record.basicSalary, 0),
      totalCommission: payrollRecords.reduce((sum, record) => sum + record.commission, 0),
      totalBonuses: payrollRecords.reduce((sum, record) => sum + record.bonuses, 0),
      totalDeductions: payrollRecords.reduce((sum, record) => sum + record.deductions, 0),
      totalHours: payrollRecords.reduce((sum, record) => sum + record.hoursWorked, 0),
      totalOrders: payrollRecords.reduce((sum, record) => sum + record.completedOrders, 0)
    };
    
    logger.info(`管理员查询了${targetYear}年${targetMonth}月的工资单，返回 ${payrollRecords.length} 条记录`);
    
    ctx.body = {
      status: 'success',
      data: {
        payroll: payrollRecords,
        summary,
        period: {
          year: targetYear,
          month: targetMonth
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取工资单失败:', error);
    throw createError.internal('获取工资单失败');
  }
};

module.exports = {
  getPayments,
  getPayroll
};
