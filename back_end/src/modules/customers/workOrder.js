const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('WorkOrders');

/**
 * 获取当前客户的所有工单
 * 
 * @param {Object} ctx - Koa上下文
 */
const getMyWorkOrders = async (ctx) => {
  const { user } = ctx.state;
  const { status, page = 1, limit = 10 } = ctx.query;
  
  // 构建查询条件
  const query = { userId: user.id };
  if (status) {
    query.status = status;
  }
  
  // 从数据库获取用户的工单
  // 实际项目中替换为数据库查询
  const workOrders = [
    {
      id: 'wo1',
      vehicleId: 'v1',
      vehicleInfo: {
        make: '丰田',
        model: '卡罗拉',
        licensePlate: '京A12345'
      },
      description: '发动机异响，怠速不稳',
      status: 'in_progress',
      createdAt: '2023-05-15T08:30:00Z',
      estimatedCompletionTime: '2023-05-17T16:00:00Z',
      mechanicId: 'mech1',
      mechanicName: '李师傅',
      priority: 'normal',
      totalCost: 1200
    },
    {
      id: 'wo2',
      vehicleId: 'v2',
      vehicleInfo: {
        make: '本田',
        model: '思域',
        licensePlate: '京B67890'
      },
      description: '更换刹车片，更换机油',
      status: 'completed',
      createdAt: '2023-04-10T09:15:00Z',
      completedAt: '2023-04-10T15:45:00Z',
      mechanicId: 'mech2',
      mechanicName: '王师傅',
      priority: 'normal',
      totalCost: 800,
      feedback: {
        rating: 5,
        comment: '服务非常满意，修理得很好'
      }
    }
  ];
  
  ctx.body = {
    status: 'success',
    data: {
      workOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: workOrders.length,
        pages: Math.ceil(workOrders.length / parseInt(limit))
      }
    }
  };
};

/**
 * 创建新工单
 * 
 * @param {Object} ctx - Koa上下文
 */
const createWorkOrder = async (ctx) => {
  const { user } = ctx.state;
  const orderData = ctx.request.body;
  
  // 验证工单数据
  const requiredFields = ['vehicleId', 'description'];
  
  for (const field of requiredFields) {
    if (!orderData[field]) {
      throw createError.validation(`缺少必填字段: ${field}`);
    }
  }
  
  // 检查车辆是否存在并属于该用户
  // 实际项目中替换为数据库查询
  const vehicle = {
    id: orderData.vehicleId,
    make: '丰田',
    model: '卡罗拉',
    licensePlate: '京A12345',
    userId: user.id
  };
  
  if (!vehicle) {
    throw createError.notFound('未找到该车辆');
  }
  
  if (vehicle.userId !== user.id) {
    throw createError.authorization('无权为该车辆创建工单');
  }
  
  // 检查是否有未完成的相同工单
  // 实际项目中替换为数据库查询
  const hasSimilarActiveOrder = false;
  
  if (hasSimilarActiveOrder) {
    throw createError.conflict('该车辆已有类似的未完成工单');
  }
  
  // 创建新工单（保存到数据库）
  const newWorkOrder = {
    id: 'wo' + Date.now(),
    userId: user.id,
    vehicleId: orderData.vehicleId,
    vehicleInfo: {
      make: vehicle.make,
      model: vehicle.model,
      licensePlate: vehicle.licensePlate
    },
    description: orderData.description,
    preferredTime: orderData.preferredTime || null,
    additionalNotes: orderData.additionalNotes || '',
    status: 'pending',
    priority: orderData.priority || 'normal',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  logger.info(`用户 ${user.id} 为车辆 ${vehicle.id} 创建了新工单`);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    message: '工单创建成功',
    data: {
      workOrder: newWorkOrder
    }
  };
};

/**
 * 获取工单详情
 * 
 * @param {Object} ctx - Koa上下文
 */
const getWorkOrderById = async (ctx) => {
  const { user } = ctx.state;
  const orderId = ctx.params.id;
  
  // 从数据库获取工单信息
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    userId: user.id,
    vehicleId: 'v1',
    vehicleInfo: {
      make: '丰田',
      model: '卡罗拉',
      licensePlate: '京A12345',
      vin: 'ABC123456789'
    },
    description: '发动机异响，怠速不稳',
    status: 'in_progress',
    createdAt: '2023-05-15T08:30:00Z',
    estimatedCompletionTime: '2023-05-17T16:00:00Z',
    mechanicId: 'mech1',
    mechanicInfo: {
      name: '李师傅',
      phone: '13900001111',
      specialties: ['发动机维修', '电子系统诊断']
    },
    priority: 'normal',
    progressUpdates: [
      {
        time: '2023-05-15T10:30:00Z',
        status: 'accepted',
        note: '工单已接受，正在准备零件'
      },
      {
        time: '2023-05-16T09:15:00Z',
        status: 'in_progress',
        note: '已开始检查发动机，初步诊断为火花塞问题'
      }
    ],
    materials: [
      {
        name: '火花塞',
        quantity: 4,
        unitPrice: 150,
        total: 600
      },
      {
        name: '机油',
        quantity: 1,
        unitPrice: 300,
        total: 300
      }
    ],
    laborCost: 300,
    totalCost: 1200
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('未找到该工单');
  }
  
  // 检查工单是否属于当前用户
  if (workOrder.userId !== user.id) {
    throw createError.authorization('无权查看该工单');
  }
  
  ctx.body = {
    status: 'success',
    data: {
      workOrder
    }
  };
};

/**
 * 为工单添加评价
 * 
 * @param {Object} ctx - Koa上下文
 */
const addWorkOrderFeedback = async (ctx) => {
  const { user } = ctx.state;
  const orderId = ctx.params.id;
  const { rating, comment } = ctx.request.body;
  
  // 验证评价数据
  if (!rating || rating < 1 || rating > 5) {
    throw createError.validation('评分必须在1-5之间');
  }
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    userId: user.id,
    status: 'completed',
    mechanicId: 'mech1',
    feedback: null
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('未找到该工单');
  }
  
  // 检查工单是否属于当前用户
  if (workOrder.userId !== user.id) {
    throw createError.authorization('无权为该工单添加评价');
  }
  
  // 检查工单是否已完成
  if (workOrder.status !== 'completed') {
    throw createError.validation('只能为已完成的工单添加评价');
  }
  
  // 检查是否已评价
  if (workOrder.feedback) {
    throw createError.conflict('该工单已有评价');
  }
  
  // 添加评价（保存到数据库）
  const feedback = {
    rating,
    comment: comment || '',
    createdAt: new Date()
  };
  
  logger.info(`用户 ${user.id} 为工单 ${orderId} 添加了评价，评分: ${rating}`);
  
  ctx.body = {
    status: 'success',
    message: '评价添加成功',
    data: {
      feedback
    }
  };
};

/**
 * 催促工单
 * 
 * @param {Object} ctx - Koa上下文
 */
const urgeWorkOrder = async (ctx) => {
  const { user } = ctx.state;
  const orderId = ctx.params.id;
  const { message } = ctx.request.body;
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    userId: user.id,
    status: 'in_progress',
    mechanicId: 'mech1',
    lastUrgedAt: null
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('未找到该工单');
  }
  
  // 检查工单是否属于当前用户
  if (workOrder.userId !== user.id) {
    throw createError.authorization('无权催促该工单');
  }
  
  // 检查工单状态是否可催促
  const urgableStatuses = ['accepted', 'in_progress', 'pending'];
  if (!urgableStatuses.includes(workOrder.status)) {
    throw createError.validation(`状态为 ${workOrder.status} 的工单不能催促`);
  }
  
  // 检查上次催促时间，避免频繁催促
  if (workOrder.lastUrgedAt) {
    const lastUrged = new Date(workOrder.lastUrgedAt);
    const hoursSinceLastUrge = (Date.now() - lastUrged.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastUrge < 4) {
      throw createError.rateLimit('请勿频繁催促，4小时内只能催促一次');
    }
  }
  
  // 记录催促信息（保存到数据库）
  const urgeRecord = {
    workOrderId: orderId,
    userId: user.id,
    mechanicId: workOrder.mechanicId,
    message: message || '客户催促完成工单',
    createdAt: new Date()
  };
  
  logger.info(`用户 ${user.id} 催促了工单 ${orderId}`);
  
  ctx.body = {
    status: 'success',
    message: '催促成功，已通知技师',
    data: {
      urgeRecord
    }
  };
};

module.exports = {
  getMyWorkOrders,
  createWorkOrder,
  getWorkOrderById,
  addWorkOrderFeedback,
  urgeWorkOrder
};