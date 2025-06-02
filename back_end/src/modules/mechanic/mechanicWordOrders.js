const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('MechanicWorkOrders');

/**
 * 获取当前技师的工单列表
 * 
 * @param {Object} ctx - Koa上下文
 */
const getMyWorkOrders = async (ctx) => {
  const { user } = ctx.state;
  const { status, page = 1, limit = 10 } = ctx.query;
  
  // 构建查询条件
  const query = { mechanicId: user.id };
  if (status) {
    query.status = status;
  }
  
  // 从数据库获取技师的工单
  // 实际项目中替换为数据库查询
  const workOrders = [
    {
      id: 'wo1',
      vehicleId: 'v1',
      vehicleInfo: {
        make: '丰田',
        model: '卡罗拉',
        licensePlate: '京A12345',
        year: 2020
      },
      customerId: 'cust1',
      customerInfo: {
        name: '张三',
        phone: '13800138000'
      },
      description: '发动机异响，怠速不稳',
      status: 'in_progress',
      createdAt: '2023-05-15T08:30:00Z',
      acceptedAt: '2023-05-15T09:45:00Z',
      estimatedCompletionTime: '2023-05-17T16:00:00Z',
      priority: 'normal',
      estimatedCost: 1200,
      progressNotes: [
        {
          time: '2023-05-15T10:30:00Z',
          note: '初步检查完成，怀疑是火花塞问题'
        },
        {
          time: '2023-05-16T09:15:00Z',
          note: '更换火花塞，测试中'
        }
      ]
    },
    {
      id: 'wo2',
      vehicleId: 'v2',
      vehicleInfo: {
        make: '本田',
        model: '思域',
        licensePlate: '京B67890',
        year: 2019
      },
      customerId: 'cust2',
      customerInfo: {
        name: '李四',
        phone: '13900001111'
      },
      description: '更换刹车片，更换机油',
      status: 'pending',
      createdAt: '2023-05-16T14:20:00Z',
      priority: 'high',
      estimatedCost: 800
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
 * 接受工单
 * 
 * @param {Object} ctx - Koa上下文
 */
const acceptWorkOrder = async (ctx) => {
  const { user } = ctx.state;
  const orderId = ctx.params.id;
  const { estimatedCompletionTime, estimatedCost } = ctx.request.body;
  
  // 验证数据
  if (!estimatedCompletionTime) {
    throw createError.validation('必须提供预计完成时间');
  }
  
  if (!estimatedCost) {
    throw createError.validation('必须提供预计费用');
  }
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    status: 'pending',
    mechanicId: null
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('未找到该工单');
  }
  
  // 检查工单状态是否为待接受
  if (workOrder.status !== 'pending') {
    throw createError.conflict('该工单已被接受或已完成');
  }
  
  // 检查技师当前工单数量，避免超负荷
  // 实际项目中替换为数据库查询
  const activeOrderCount = 5;
  const maxActiveOrders = 10;
  
  if (activeOrderCount >= maxActiveOrders) {
    throw createError.conflict('您当前有太多活跃工单，请先完成一些现有工单');
  }
  
  // 更新工单（在数据库中）
  // 实际项目中替换为数据库更新操作
  const updatedWorkOrder = {
    ...workOrder,
    status: 'accepted',
    mechanicId: user.id,
    acceptedAt: new Date(),
    estimatedCompletionTime,
    estimatedCost
  };
  
  logger.info(`技师 ${user.id} 接受了工单 ${orderId}`);
  
  ctx.body = {
    status: 'success',
    message: '工单已接受',
    data: {
      workOrder: updatedWorkOrder
    }
  };
};

/**
 * 拒绝工单
 * 
 * @param {Object} ctx - Koa上下文
 */
const refuseWorkOrder = async (ctx) => {
  const { user } = ctx.state;
  const orderId = ctx.params.id;
  const { reason } = ctx.request.body;
  
  if (!reason) {
    throw createError.validation('必须提供拒绝原因');
  }
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    status: 'pending'
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('未找到该工单');
  }
  
  // 检查工单状态
  if (workOrder.status !== 'pending') {
    throw createError.conflict('只能拒绝处于待接受状态的工单');
  }
  
  // 记录拒绝信息（在数据库中）
  // 实际项目中替换为数据库操作
  const refusalRecord = {
    workOrderId: orderId,
    mechanicId: user.id,
    reason,
    refusedAt: new Date()
  };
  
  logger.info(`技师 ${user.id} 拒绝了工单 ${orderId}，原因: ${reason}`);
  
  ctx.body = {
    status: 'success',
    message: '工单已拒绝',
    data: {
      refusalRecord
    }
  };
};

/**
 * 更新工单进度
 * 
 * @param {Object} ctx - Koa上下文
 */
const updateWorkOrderProgress = async (ctx) => {
  const { user } = ctx.state;
  const orderId = ctx.params.id;
  const { progressNote, estimatedCompletionTime } = ctx.request.body;
  
  if (!progressNote) {
    throw createError.validation('必须提供进度备注');
  }
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    mechanicId: user.id,
    status: 'accepted'
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('未找到该工单');
  }
  
  // 检查工单是否属于当前技师
  if (workOrder.mechanicId !== user.id) {
    throw createError.authorization('无权更新该工单');
  }
  
  // 检查工单状态
  const allowedStatuses = ['accepted', 'in_progress'];
  if (!allowedStatuses.includes(workOrder.status)) {
    throw createError.conflict(`状态为 ${workOrder.status} 的工单不能更新进度`);
  }
  
  // 更新工单进度（在数据库中）
  // 实际项目中替换为数据库更新操作
  const progressUpdate = {
    workOrderId: orderId,
    mechanicId: user.id,
    note: progressNote,
    time: new Date(),
    estimatedCompletionTime: estimatedCompletionTime || workOrder.estimatedCompletionTime
  };
  
  // 如果工单状态是已接受，更新为进行中
  const newStatus = workOrder.status === 'accepted' ? 'in_progress' : workOrder.status;
  
  logger.info(`技师 ${user.id} 更新了工单 ${orderId} 的进度`);
  
  ctx.body = {
    status: 'success',
    message: '工单进度已更新',
    data: {
      progressUpdate,
      status: newStatus
    }
  };
};

/**
 * 记录工单所用材料
 * 
 * @param {Object} ctx - Koa上下文
 */
const recordWorkOrderMaterials = async (ctx) => {
  const { user } = ctx.state;
  const orderId = ctx.params.id;
  const { materials } = ctx.request.body;
  
  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    throw createError.validation('必须提供有效的材料列表');
  }
  
  // 验证材料数据
  for (const material of materials) {
    if (!material.name || !material.quantity || !material.unitPrice) {
      throw createError.validation('每个材料必须包含名称、数量和单价');
    }
    
    if (isNaN(material.quantity) || material.quantity <= 0) {
      throw createError.validation('材料数量必须大于0');
    }
    
    if (isNaN(material.unitPrice) || material.unitPrice <= 0) {
      throw createError.validation('材料单价必须大于0');
    }
  }
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    mechanicId: user.id,
    status: 'in_progress'
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('未找到该工单');
  }
  
  // 检查工单是否属于当前技师
  if (workOrder.mechanicId !== user.id) {
    throw createError.authorization('无权为该工单添加材料');
  }
  
  // 检查工单状态
  if (workOrder.status !== 'in_progress') {
    throw createError.conflict('只能为进行中的工单添加材料');
  }
  
  // 计算材料总价
  const materialsWithTotal = materials.map(material => ({
    ...material,
    total: material.quantity * material.unitPrice
  }));
  
  const totalMaterialCost = materialsWithTotal.reduce((sum, material) => sum + material.total, 0);
  
  // 记录材料信息（在数据库中）
  // 实际项目中替换为数据库操作
  const materialRecord = {
    workOrderId: orderId,
    mechanicId: user.id,
    materials: materialsWithTotal,
    totalCost: totalMaterialCost,
    recordedAt: new Date()
  };
  
  logger.info(`技师 ${user.id} 为工单 ${orderId} 记录了材料，总价: ${totalMaterialCost}`);
  
  ctx.body = {
    status: 'success',
    message: '材料记录已添加',
    data: {
      materialRecord
    }
  };
};

/**
 * 完成工单
 * 
 * @param {Object} ctx - Koa上下文
 */
const completeWorkOrder = async (ctx) => {
  const { user } = ctx.state;
  const orderId = ctx.params.id;
  const { laborCost, summaryReport } = ctx.request.body;
  
  if (!laborCost) {
    throw createError.validation('必须提供人工费用');
  }
  
  if (!summaryReport) {
    throw createError.validation('必须提供维修总结报告');
  }
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    mechanicId: user.id,
    status: 'in_progress',
    materials: [
      { name: '火花塞', quantity: 4, unitPrice: 150, total: 600 },
      { name: '机油', quantity: 1, unitPrice: 300, total: 300 }
    ]
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('未找到该工单');
  }
  
  // 检查工单是否属于当前技师
  if (workOrder.mechanicId !== user.id) {
    throw createError.authorization('无权完成该工单');
  }
  
  // 检查工单状态
  if (workOrder.status !== 'in_progress') {
    throw createError.conflict('只能完成进行中的工单');
  }
  
  // 检查是否已添加材料
  if (!workOrder.materials || workOrder.materials.length === 0) {
    throw createError.validation('必须先添加维修所用材料');
  }
  
  // 计算总费用
  const materialCost = workOrder.materials.reduce((sum, material) => sum + material.total, 0);
  const totalCost = materialCost + parseFloat(laborCost);
  
  // 更新工单为已完成（在数据库中）
  // 实际项目中替换为数据库更新操作
  const completedWorkOrder = {
    ...workOrder,
    status: 'completed',
    completedAt: new Date(),
    laborCost: parseFloat(laborCost),
    totalCost,
    summaryReport
  };
  
  logger.info(`技师 ${user.id} 完成了工单 ${orderId}，总费用: ${totalCost}`);
  
  ctx.body = {
    status: 'success',
    message: '工单已完成',
    data: {
      workOrder: completedWorkOrder
    }
  };
};

module.exports = {
  getMyWorkOrders,
  acceptWorkOrder,
  refuseWorkOrder,
  updateWorkOrderProgress,
  recordWorkOrderMaterials,
  completeWorkOrder
};
