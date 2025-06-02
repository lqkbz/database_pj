const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminVehicleWorkOrder');

/**
 * 获取所有车辆列表（管理员视图）
 * 
 * @param {Object} ctx - Koa上下文
 */
const listVehicles = async (ctx) => {
  const { page = 1, limit = 10, search, make, status } = ctx.query;
  
  // 构建查询条件
  const query = {};
  if (search) {
    // 实际项目中替换为搜索条件
    query.search = search;
  }
  
  if (make) {
    query.make = make;
  }
  
  if (status) {
    query.status = status;
  }
  
  // 从数据库获取车辆列表
  // 实际项目中替换为数据库查询
  const vehicles = [
    {
      id: 'v1',
      make: '丰田',
      model: '卡罗拉',
      year: 2020,
      licensePlate: '京A12345',
      vin: 'ABC123456789',
      owner: {
        id: 'user1',
        name: '张三',
        phone: '13800138000'
      },
      status: 'active',
      lastMaintenanceDate: '2023-01-15',
      orderCount: 3
    },
    {
      id: 'v2',
      make: '本田',
      model: '思域',
      year: 2019,
      licensePlate: '京B67890',
      vin: 'DEF987654321',
      owner: {
        id: 'user2',
        name: '李四',
        phone: '13900001111'
      },
      status: 'active',
      lastMaintenanceDate: '2022-11-20',
      orderCount: 2
    },
    {
      id: 'v3',
      make: '大众',
      model: '帕萨特',
      year: 2018,
      licensePlate: '京C54321',
      vin: 'GHI567891234',
      owner: {
        id: 'user3',
        name: '王五',
        phone: '13700002222'
      },
      status: 'inactive',
      lastMaintenanceDate: '2022-09-05',
      orderCount: 5
    }
  ];
  
  // 计算总数量
  const total = vehicles.length;
  
  logger.info(`管理员查询了车辆列表，返回 ${vehicles.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
      vehicles,
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
 * 获取所有工单列表（管理员视图）
 * 
 * @param {Object} ctx - Koa上下文
 */
const listWorkOrders = async (ctx) => {
  const { page = 1, limit = 10, status, mechanic, customer, dateFrom, dateTo } = ctx.query;
  
  // 构建查询条件
  const query = {};
  if (status) {
    query.status = status;
  }
  
  if (mechanic) {
    query.mechanicId = mechanic;
  }
  
  if (customer) {
    query.customerId = customer;
  }
  
  if (dateFrom) {
    query.dateFrom = dateFrom;
  }
  
  if (dateTo) {
    query.dateTo = dateTo;
  }
  
  // 从数据库获取工单列表
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
      customerId: 'user1',
      customerInfo: {
        name: '张三',
        phone: '13800138000'
      },
      mechanicId: 'mech1',
      mechanicInfo: {
        name: '李师傅',
        phone: '13911112222'
      },
      description: '发动机异响，怠速不稳',
      status: 'in_progress',
      priority: 'normal',
      createdAt: '2023-05-15T08:30:00Z',
      acceptedAt: '2023-05-15T09:45:00Z',
      estimatedCompletionTime: '2023-05-17T16:00:00Z',
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
      customerId: 'user2',
      customerInfo: {
        name: '李四',
        phone: '13900001111'
      },
      mechanicId: 'mech2',
      mechanicInfo: {
        name: '王师傅',
        phone: '13922223333'
      },
      description: '更换刹车片，更换机油',
      status: 'completed',
      priority: 'normal',
      createdAt: '2023-04-10T09:15:00Z',
      acceptedAt: '2023-04-10T10:30:00Z',
      completedAt: '2023-04-10T15:45:00Z',
      totalCost: 800,
      feedback: {
        rating: 5,
        comment: '服务非常满意，修理得很好'
      }
    },
    {
      id: 'wo3',
      vehicleId: 'v3',
      vehicleInfo: {
        make: '大众',
        model: '帕萨特',
        licensePlate: '京C54321'
      },
      customerId: 'user3',
      customerInfo: {
        name: '王五',
        phone: '13700002222'
      },
      description: '更换变速箱油',
      status: 'pending',
      priority: 'high',
      createdAt: '2023-05-18T10:45:00Z'
    }
  ];
  
  // 计算总数量
  const total = workOrders.length;
  
  logger.info(`管理员查询了工单列表，返回 ${workOrders.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
      workOrders,
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
 * 更新工单信息（管理员操作）
 * 
 * @param {Object} ctx - Koa上下文
 */
const updateWorkOrder = async (ctx) => {
  const orderId = ctx.params.id;
  const updateData = ctx.request.body;
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    status: 'pending',
    vehicleId: 'v1',
    customerId: 'user1',
    mechanicId: null
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('工单不存在');
  }
  
  // 验证更新数据
  const allowedFields = ['status', 'priority', 'mechanicId', 'description', 'estimatedCompletionTime', 'estimatedCost'];
  const updates = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = updateData[key];
    }
  });
  
  if (Object.keys(updates).length === 0) {
    throw createError.validation('没有提供有效的更新字段');
  }
  
  // 特殊字段验证
  if (updates.status && !['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(updates.status)) {
    throw createError.validation('无效的状态值');
  }
  
  if (updates.priority && !['low', 'normal', 'high', 'urgent'].includes(updates.priority)) {
    throw createError.validation('无效的优先级值');
  }
  
  if (updates.mechanicId) {
    // 检查技师是否存在
    // 实际项目中替换为数据库查询
    const mechanicExists = true;
    
    if (!mechanicExists) {
      throw createError.validation('指定的技师不存在');
    }
    
    // 如果工单状态是待分配，且分配了技师，则更新状态为已接受
    if (workOrder.status === 'pending' && !workOrder.mechanicId) {
      updates.status = 'accepted';
      updates.acceptedAt = new Date().toISOString();
    }
  }
  
  // 更新工单信息（在数据库中）
  // 实际项目中替换为数据库更新操作
  
  logger.info(`管理员更新了工单 ${orderId} 的信息`);
  
  ctx.body = {
    status: 'success',
    message: '工单信息已更新',
    data: {
      orderId,
      updatedFields: Object.keys(updates)
    }
  };
};

/**
 * 删除工单（管理员操作）
 * 
 * @param {Object} ctx - Koa上下文
 */
const deleteWorkOrder = async (ctx) => {
  const orderId = ctx.params.id;
  
  // 获取工单信息（从数据库）
  // 实际项目中替换为数据库查询
  const workOrder = {
    id: orderId,
    status: 'pending'
  };
  
  // 检查工单是否存在
  if (!workOrder) {
    throw createError.notFound('工单不存在');
  }
  
  // 检查工单状态，只允许删除待处理或已取消的工单
  if (!['pending', 'cancelled'].includes(workOrder.status)) {
    throw createError.conflict(`状态为 ${workOrder.status} 的工单不能删除，请先取消工单`);
  }
  
  // 删除工单（在数据库中）
  // 实际项目中替换为数据库删除操作
  // 注意：实际应用中可能使用软删除（更新状态）而不是硬删除
  
  logger.info(`管理员删除了工单 ${orderId}`);
  
  ctx.body = {
    status: 'success',
    message: '工单已删除'
  };
};

module.exports = {
  listVehicles,
  listWorkOrders,
  updateWorkOrder,
  deleteWorkOrder
};