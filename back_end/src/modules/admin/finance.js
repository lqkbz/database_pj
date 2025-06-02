const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminFinance');

/**
 * 获取支付记录列表
 * 
 * @param {Object} ctx - Koa上下文
 */
const getPayments = async (ctx) => {
  const { page = 1, limit = 10, status, startDate, endDate, customer, type } = ctx.query;
  
  // 构建查询条件
  const query = {};
  if (status) {
    query.status = status;
  }
  
  if (startDate) {
    query.startDate = startDate;
  }
  
  if (endDate) {
    query.endDate = endDate;
  }
  
  if (customer) {
    query.customer = customer;
  }
  
  if (type) {
    query.type = type;
  }
  
  // 从数据库获取支付记录
  // 实际项目中替换为数据库查询
  const payments = [
    {
      id: 'pay1',
      workOrderId: 'wo1',
      workOrderInfo: {
        description: '发动机异响，怠速不稳',
        vehiclePlate: '京A12345'
      },
      customerId: 'user1',
      customerInfo: {
        name: '张三',
        phone: '13800138000'
      },
      amount: 1200.00,
      type: 'repair',
      method: 'wechat',
      status: 'completed',
      transactionId: 'wx123456789',
      createdAt: '2023-05-17T16:30:00Z',
      completedAt: '2023-05-17T16:32:15Z',
      receiptUrl: 'https://example.com/receipts/pay1.pdf',
      note: '正常支付'
    },
    {
      id: 'pay2',
      workOrderId: 'wo2',
      workOrderInfo: {
        description: '更换刹车片，更换机油',
        vehiclePlate: '京B67890'
      },
      customerId: 'user2',
      customerInfo: {
        name: '李四',
        phone: '13900001111'
      },
      amount: 800.00,
      type: 'repair',
      method: 'alipay',
      status: 'completed',
      transactionId: 'zfb987654321',
      createdAt: '2023-04-10T15:45:00Z',
      completedAt: '2023-04-10T15:48:30Z',
      receiptUrl: 'https://example.com/receipts/pay2.pdf',
      note: '正常支付'
    },
    {
      id: 'pay3',
      customerId: 'user3',
      customerInfo: {
        name: '王五',
        phone: '13700002222'
      },
      amount: 500.00,
      type: 'deposit',
      method: 'bank_transfer',
      status: 'pending',
      transactionId: null,
      createdAt: '2023-05-19T09:15:00Z',
      completedAt: null,
      note: '预付款，等待银行确认'
    },
    {
      id: 'pay4',
      workOrderId: 'wo5',
      workOrderInfo: {
        description: '更换变速箱油',
        vehiclePlate: '京C54321'
      },
      customerId: 'user3',
      customerInfo: {
        name: '王五',
        phone: '13700002222'
      },
      amount: 350.00,
      type: 'repair',
      method: 'cash',
      status: 'completed',
      transactionId: 'cash001',
      createdAt: '2023-05-20T14:20:00Z',
      completedAt: '2023-05-20T14:20:00Z',
      receiptUrl: 'https://example.com/receipts/pay4.pdf',
      note: '现金支付'
    },
    {
      id: 'ref1',
      workOrderId: 'wo6',
      workOrderInfo: {
        description: '检查发动机故障灯',
        vehiclePlate: '京D12345'
      },
      customerId: 'user4',
      customerInfo: {
        name: '赵六',
        phone: '13600003333'
      },
      amount: -200.00,
      type: 'refund',
      method: 'wechat',
      status: 'completed',
      transactionId: 'wxref123456',
      createdAt: '2023-05-22T10:30:00Z',
      completedAt: '2023-05-22T10:35:45Z',
      originalPaymentId: 'pay5',
      note: '部分退款，客户不满意服务'
    }
  ];
  
  // 应用筛选条件
  let filteredPayments = payments;
  
  if (query.status) {
    filteredPayments = filteredPayments.filter(p => p.status === query.status);
  }
  
  if (query.startDate) {
    const startDateObj = new Date(query.startDate);
    filteredPayments = filteredPayments.filter(p => new Date(p.createdAt) >= startDateObj);
  }
  
  if (query.endDate) {
    const endDateObj = new Date(query.endDate);
    filteredPayments = filteredPayments.filter(p => new Date(p.createdAt) <= endDateObj);
  }
  
  if (query.customer) {
    filteredPayments = filteredPayments.filter(p => 
      p.customerInfo.name.includes(query.customer) || 
      p.customerId === query.customer
    );
  }
  
  if (query.type) {
    filteredPayments = filteredPayments.filter(p => p.type === query.type);
  }
  
  // 计算总数量
  const total = filteredPayments.length;
  
  // 统计信息
  const summary = {
    totalAmount: filteredPayments
      .filter(p => p.status === 'completed' && p.type !== 'refund')
      .reduce((sum, p) => sum + p.amount, 0),
    refundAmount: Math.abs(filteredPayments
      .filter(p => p.type === 'refund' && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)),
    pendingAmount: filteredPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0),
    completedCount: filteredPayments.filter(p => p.status === 'completed').length,
    pendingCount: filteredPayments.filter(p => p.status === 'pending').length,
    refundCount: filteredPayments.filter(p => p.type === 'refund').length
  };
  
  logger.info(`管理员查询了支付记录，返回 ${filteredPayments.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
      payments: filteredPayments,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  };
};

/**
 * 获取工资单列表
 * 
 * @param {Object} ctx - Koa上下文
 */
const getPayroll = async (ctx) => {
  const { page = 1, limit = 10, month, year, mechanic, status } = ctx.query;
  
  // 默认为当前月份
  const now = new Date();
  const currentMonth = month ? parseInt(month) : now.getMonth() + 1;
  const currentYear = year ? parseInt(year) : now.getFullYear();
  
  // 构建查询条件
  const query = {
    month: currentMonth,
    year: currentYear
  };
  
  if (mechanic) {
    query.mechanic = mechanic;
  }
  
  if (status) {
    query.status = status;
  }
  
  // 从数据库获取工资单记录
  // 实际项目中替换为数据库查询
  const payrollRecords = [
    {
      id: 'pr1',
      mechanicId: 'mech1',
      mechanicInfo: {
        name: '李师傅',
        phone: '13911112222',
        email: 'lishifu@example.com'
      },
      month: 5,
      year: 2023,
      basicSalary: 5000.00,
      workOrderCommission: 6800.00,
      bonuses: 1000.00,
      deductions: 0.00,
      totalAmount: 12800.00,
      completedOrders: 16,
      status: 'paid',
      paymentDate: '2023-06-01T10:30:00Z',
      paymentMethod: 'bank_transfer',
      transactionId: 'bank123456',
      note: '包含季度绩效奖金'
    },
    {
      id: 'pr2',
      mechanicId: 'mech2',
      mechanicInfo: {
        name: '王师傅',
        phone: '13922223333',
        email: 'wangshifu@example.com'
      },
      month: 5,
      year: 2023,
      basicSalary: 4500.00,
      workOrderCommission: 5200.00,
      bonuses: 0.00,
      deductions: 200.00,
      totalAmount: 9500.00,
      completedOrders: 12,
      status: 'paid',
      paymentDate: '2023-06-01T10:35:00Z',
      paymentMethod: 'bank_transfer',
      transactionId: 'bank123457',
      note: '迟到扣款200元'
    },
    {
      id: 'pr3',
      mechanicId: 'mech3',
      mechanicInfo: {
        name: '张师傅',
        phone: '13933334444',
        email: 'zhangshifu@example.com'
      },
      month: 5,
      year: 2023,
      basicSalary: 4800.00,
      workOrderCommission: 4400.00,
      bonuses: 500.00,
      deductions: 0.00,
      totalAmount: 9700.00,
      completedOrders: 10,
      status: 'pending',
      paymentDate: null,
      paymentMethod: null,
      transactionId: null,
      note: '等待财务审核'
    },
    {
      id: 'pr4',
      mechanicId: 'mech1',
      mechanicInfo: {
        name: '李师傅',
        phone: '13911112222',
        email: 'lishifu@example.com'
      },
      month: 4,
      year: 2023,
      basicSalary: 5000.00,
      workOrderCommission: 6500.00,
      bonuses: 0.00,
      deductions: 0.00,
      totalAmount: 11500.00,
      completedOrders: 15,
      status: 'paid',
      paymentDate: '2023-05-05T09:15:00Z',
      paymentMethod: 'bank_transfer',
      transactionId: 'bank123400',
      note: '正常发放'
    }
  ];
  
  // 应用筛选条件
  let filteredPayroll = payrollRecords;
  
  if (query.month && query.year) {
    filteredPayroll = filteredPayroll.filter(p => 
      p.month === query.month && p.year === query.year
    );
  }
  
  if (query.mechanic) {
    filteredPayroll = filteredPayroll.filter(p => 
      p.mechanicInfo.name.includes(query.mechanic) || 
      p.mechanicId === query.mechanic
    );
  }
  
  if (query.status) {
    filteredPayroll = filteredPayroll.filter(p => p.status === query.status);
  }
  
  // 计算总数量
  const total = filteredPayroll.length;
  
  // 统计信息
  const summary = {
    totalPayroll: filteredPayroll.reduce((sum, p) => sum + p.totalAmount, 0),
    averagePayroll: total > 0 ? filteredPayroll.reduce((sum, p) => sum + p.totalAmount, 0) / total : 0,
    totalBasicSalary: filteredPayroll.reduce((sum, p) => sum + p.basicSalary, 0),
    totalCommission: filteredPayroll.reduce((sum, p) => sum + p.workOrderCommission, 0),
    totalBonuses: filteredPayroll.reduce((sum, p) => sum + p.bonuses, 0),
    totalDeductions: filteredPayroll.reduce((sum, p) => sum + p.deductions, 0),
    paidCount: filteredPayroll.filter(p => p.status === 'paid').length,
    pendingCount: filteredPayroll.filter(p => p.status === 'pending').length
  };
  
  logger.info(`管理员查询了${query.year}年${query.month}月的工资单，返回 ${filteredPayroll.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
      payroll: filteredPayroll,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  };
};

module.exports = {
  getPayments,
  getPayroll
};
