const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminInventory');

/**
 * 获取所有零部件列表
 * 
 * @param {Object} ctx - Koa上下文
 */
const listParts = async (ctx) => {
  const { page = 1, limit = 10, search, category, status } = ctx.query;
  
  // 构建查询条件
  const query = {};
  if (search) {
    // 实际项目中替换为搜索条件
    query.search = search;
  }
  
  if (category) {
    query.category = category;
  }
  
  if (status) {
    query.status = status;
  }
  
  // 从数据库获取零部件列表
  // 实际项目中替换为数据库查询
  const parts = [
    {
      id: 'part1',
      name: '机油滤清器',
      code: 'OIL-FIL-001',
      category: '滤清器',
      brand: '博世',
      model: 'P7100',
      compatibleVehicles: ['丰田', '本田', '日产'],
      unitPrice: 45.0,
      costPrice: 30.0,
      currentStock: 120,
      minStock: 20,
      status: 'active',
      location: 'A-01-02',
      imageUrl: 'https://example.com/images/oil-filter.jpg'
    },
    {
      id: 'part2',
      name: '火花塞',
      code: 'SPARK-001',
      category: '点火系统',
      brand: 'NGK',
      model: 'BKR6E',
      compatibleVehicles: ['丰田', '本田', '马自达'],
      unitPrice: 35.0,
      costPrice: 22.0,
      currentStock: 80,
      minStock: 15,
      status: 'active',
      location: 'A-02-03',
      imageUrl: 'https://example.com/images/spark-plug.jpg'
    },
    {
      id: 'part3',
      name: '刹车片',
      code: 'BRAKE-001',
      category: '刹车系统',
      brand: '刹明',
      model: 'SM-650',
      compatibleVehicles: ['大众', '奥迪', '宝马'],
      unitPrice: 280.0,
      costPrice: 180.0,
      currentStock: 35,
      minStock: 10,
      status: 'active',
      location: 'B-01-01',
      imageUrl: 'https://example.com/images/brake-pads.jpg'
    },
    {
      id: 'part4',
      name: '空气滤清器',
      code: 'AIR-FIL-001',
      category: '滤清器',
      brand: '曼牌',
      model: 'C3090',
      compatibleVehicles: ['奔驰', '宝马', '奥迪'],
      unitPrice: 75.0,
      costPrice: 50.0,
      currentStock: 5,
      minStock: 10,
      status: 'low_stock',
      location: 'A-01-04',
      imageUrl: 'https://example.com/images/air-filter.jpg'
    }
  ];
  
  // 计算总数量
  const total = parts.length;
  
  // 添加库存状态信息
  const partsWithStatus = parts.map(part => {
    let stockStatus = 'normal';
    if (part.currentStock <= 0) {
      stockStatus = 'out_of_stock';
    } else if (part.currentStock < part.minStock) {
      stockStatus = 'low_stock';
    }
    return { ...part, stockStatus };
  });
  
  logger.info(`管理员查询了零部件列表，返回 ${parts.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
      parts: partsWithStatus,
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
 * 获取零部件详情
 * 
 * @param {Object} ctx - Koa上下文
 */
const getPartDetail = async (ctx) => {
  const partId = ctx.params.id;
  
  // 从数据库获取零部件详情
  // 实际项目中替换为数据库查询
  const part = {
    id: partId,
    name: '机油滤清器',
    code: 'OIL-FIL-001',
    category: '滤清器',
    brand: '博世',
    model: 'P7100',
    compatibleVehicles: ['丰田', '本田', '日产'],
    description: '高品质机油滤清器，适用于多种车型，过滤效果好，使用寿命长。',
    specifications: {
      diameter: '68mm',
      height: '87mm',
      threadSize: '3/4-16 UNF'
    },
    unitPrice: 45.0,
    costPrice: 30.0,
    currentStock: 120,
    minStock: 20,
    maxStock: 200,
    status: 'active',
    location: 'A-01-02',
    supplier: {
      id: 'sup1',
      name: '汽配优选',
      contact: '张经理',
      phone: '13988889999'
    },
    imageUrl: 'https://example.com/images/oil-filter.jpg',
    stockHistory: [
      {
        type: 'in',
        quantity: 50,
        date: '2023-04-15T09:30:00Z',
        operator: '李管理',
        remark: '常规进货'
      },
      {
        type: 'out',
        quantity: 8,
        date: '2023-04-20T14:15:00Z',
        operator: '王技师',
        workOrder: 'wo1',
        remark: '用于车辆保养'
      },
      {
        type: 'in',
        quantity: 100,
        date: '2023-05-10T10:45:00Z',
        operator: '李管理',
        remark: '批量采购'
      },
      {
        type: 'out',
        quantity: 22,
        date: '2023-05-12T16:30:00Z',
        operator: '赵技师',
        workOrder: 'wo5',
        remark: '多辆车保养'
      }
    ]
  };
  
  // 检查零部件是否存在
  if (!part) {
    throw createError.notFound('零部件不存在');
  }
  
  // 添加库存状态信息
  let stockStatus = 'normal';
  if (part.currentStock <= 0) {
    stockStatus = 'out_of_stock';
  } else if (part.currentStock < part.minStock) {
    stockStatus = 'low_stock';
  }
  
  logger.info(`管理员查看了零部件 ${partId} 的详细信息`);
  
  ctx.body = {
    status: 'success',
    data: {
      part: {
        ...part,
        stockStatus
      }
    }
  };
};

/**
 * 创建新零部件
 * 
 * @param {Object} ctx - Koa上下文
 */
const createPart = async (ctx) => {
  const partData = ctx.request.body;
  
  // 验证必填字段
  const requiredFields = ['name', 'code', 'category', 'brand', 'unitPrice', 'costPrice', 'minStock'];
  
  for (const field of requiredFields) {
    if (!partData[field]) {
      throw createError.validation(`缺少必填字段: ${field}`);
    }
  }
  
  // 验证价格字段
  if (isNaN(partData.unitPrice) || partData.unitPrice <= 0) {
    throw createError.validation('单价必须大于0');
  }
  
  if (isNaN(partData.costPrice) || partData.costPrice <= 0) {
    throw createError.validation('成本价必须大于0');
  }
  
  if (isNaN(partData.minStock) || partData.minStock < 0) {
    throw createError.validation('最小库存量不能为负数');
  }
  
  // 检查零件编码是否已存在
  // 实际项目中替换为数据库查询
  const codeExists = false;
  
  if (codeExists) {
    throw createError.conflict('零件编码已存在');
  }
  
  // 创建新零部件（在数据库中）
  // 实际项目中替换为数据库操作
  const newPart = {
    id: 'part' + Date.now(),
    ...partData,
    currentStock: partData.initialStock || 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  logger.info(`管理员创建了新零部件: ${newPart.name} (${newPart.code})`);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    message: '零部件创建成功',
    data: {
      part: newPart
    }
  };
};

/**
 * 更新零部件信息
 * 
 * @param {Object} ctx - Koa上下文
 */
const updatePart = async (ctx) => {
  const partId = ctx.params.id;
  const updateData = ctx.request.body;
  
  // 获取零部件信息（从数据库）
  // 实际项目中替换为数据库查询
  const part = {
    id: partId,
    name: '机油滤清器',
    code: 'OIL-FIL-001',
    status: 'active'
  };
  
  // 检查零部件是否存在
  if (!part) {
    throw createError.notFound('零部件不存在');
  }
  
  // 验证更新数据
  const allowedFields = ['name', 'category', 'brand', 'model', 'description', 'unitPrice', 'costPrice', 'minStock', 'maxStock', 'status', 'location', 'imageUrl', 'compatibleVehicles', 'specifications', 'supplier'];
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
  if (updates.unitPrice && (isNaN(updates.unitPrice) || updates.unitPrice <= 0)) {
    throw createError.validation('单价必须大于0');
  }
  
  if (updates.costPrice && (isNaN(updates.costPrice) || updates.costPrice <= 0)) {
    throw createError.validation('成本价必须大于0');
  }
  
  if (updates.minStock && (isNaN(updates.minStock) || updates.minStock < 0)) {
    throw createError.validation('最小库存量不能为负数');
  }
  
  if (updates.status && !['active', 'inactive', 'discontinued'].includes(updates.status)) {
    throw createError.validation('无效的状态值');
  }
  
  // 更新零部件信息（在数据库中）
  // 实际项目中替换为数据库更新操作
  updates.updatedAt = new Date().toISOString();
  
  logger.info(`管理员更新了零部件 ${partId} 的信息`);
  
  ctx.body = {
    status: 'success',
    message: '零部件信息已更新',
    data: {
      partId,
      updatedFields: Object.keys(updates)
    }
  };
};

/**
 * 删除零部件
 * 
 * @param {Object} ctx - Koa上下文
 */
const deletePart = async (ctx) => {
  const partId = ctx.params.id;
  
  // 获取零部件信息（从数据库）
  // 实际项目中替换为数据库查询
  const part = {
    id: partId,
    name: '机油滤清器',
    currentStock: 120,
    status: 'active'
  };
  
  // 检查零部件是否存在
  if (!part) {
    throw createError.notFound('零部件不存在');
  }
  
  // 检查是否有库存
  if (part.currentStock > 0) {
    throw createError.conflict('该零部件仍有库存，无法删除。请先清空库存或将状态设为停用');
  }
  
  // 检查是否有关联的工单
  // 实际项目中替换为数据库查询
  const hasRelatedWorkOrders = false;
  
  if (hasRelatedWorkOrders) {
    throw createError.conflict('该零部件有关联的工单记录，无法删除');
  }
  
  // 删除零部件（在数据库中）
  // 实际项目中替换为数据库删除操作
  // 注意：实际应用中可能使用软删除（更新状态）而不是硬删除
  
  logger.info(`管理员删除了零部件 ${partId}`);
  
  ctx.body = {
    status: 'success',
    message: '零部件已删除'
  };
};

/**
 * 入库操作
 * 
 * @param {Object} ctx - Koa上下文
 */
const inventoryIn = async (ctx) => {
  const { partId, quantity, supplier, purchasePrice, batchNumber, remark } = ctx.request.body;
  
  // 验证必填字段
  if (!partId) {
    throw createError.validation('缺少零部件ID');
  }
  
  if (!quantity || isNaN(quantity) || quantity <= 0) {
    throw createError.validation('数量必须大于0');
  }
  
  // 获取零部件信息（从数据库）
  // 实际项目中替换为数据库查询
  const part = {
    id: partId,
    name: '机油滤清器',
    code: 'OIL-FIL-001',
    currentStock: 120,
    status: 'active'
  };
  
  // 检查零部件是否存在
  if (!part) {
    throw createError.notFound('零部件不存在');
  }
  
  // 检查零部件状态
  if (part.status !== 'active') {
    throw createError.conflict('只能为活跃状态的零部件进行入库操作');
  }
  
  // 创建入库记录（在数据库中）
  // 实际项目中替换为数据库操作
  const inboundRecord = {
    id: 'in' + Date.now(),
    partId,
    partName: part.name,
    partCode: part.code,
    type: 'in',
    quantity: parseInt(quantity),
    previousStock: part.currentStock,
    newStock: part.currentStock + parseInt(quantity),
    supplier: supplier || null,
    purchasePrice: purchasePrice || null,
    batchNumber: batchNumber || null,
    remark: remark || null,
    operator: ctx.state.user.username,
    operatorId: ctx.state.user.id,
    createdAt: new Date().toISOString()
  };
  
  // 更新零部件库存（在数据库中）
  // 实际项目中替换为数据库更新操作
  const updatedPart = {
    ...part,
    currentStock: part.currentStock + parseInt(quantity),
    updatedAt: new Date().toISOString()
  };
  
  logger.info(`管理员为零部件 ${partId} 进行了入库操作，数量: ${quantity}`);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    message: '入库操作成功',
    data: {
      inboundRecord,
      currentStock: updatedPart.currentStock
    }
  };
};

/**
 * 出库操作
 * 
 * @param {Object} ctx - Koa上下文
 */
const inventoryOut = async (ctx) => {
  const { partId, quantity, workOrderId, mechanicId, remark } = ctx.request.body;
  
  // 验证必填字段
  if (!partId) {
    throw createError.validation('缺少零部件ID');
  }
  
  if (!quantity || isNaN(quantity) || quantity <= 0) {
    throw createError.validation('数量必须大于0');
  }
  
  // 获取零部件信息（从数据库）
  // 实际项目中替换为数据库查询
  const part = {
    id: partId,
    name: '机油滤清器',
    code: 'OIL-FIL-001',
    currentStock: 120,
    status: 'active'
  };
  
  // 检查零部件是否存在
  if (!part) {
    throw createError.notFound('零部件不存在');
  }
  
  // 检查库存是否充足
  if (part.currentStock < quantity) {
    throw createError.conflict(`库存不足，当前库存: ${part.currentStock}，请求数量: ${quantity}`);
  }
  
  // 创建出库记录（在数据库中）
  // 实际项目中替换为数据库操作
  const outboundRecord = {
    id: 'out' + Date.now(),
    partId,
    partName: part.name,
    partCode: part.code,
    type: 'out',
    quantity: parseInt(quantity),
    previousStock: part.currentStock,
    newStock: part.currentStock - parseInt(quantity),
    workOrderId: workOrderId || null,
    mechanicId: mechanicId || null,
    remark: remark || null,
    operator: ctx.state.user.username,
    operatorId: ctx.state.user.id,
    createdAt: new Date().toISOString()
  };
  
  // 更新零部件库存（在数据库中）
  // 实际项目中替换为数据库更新操作
  const updatedPart = {
    ...part,
    currentStock: part.currentStock - parseInt(quantity),
    updatedAt: new Date().toISOString()
  };
  
  // 如果库存低于最小库存，发出警告
  let stockWarning = null;
  if (updatedPart.currentStock <= 0) {
    stockWarning = '该零部件库存已耗尽，请尽快补充';
  } else if (updatedPart.currentStock < part.minStock) {
    stockWarning = `该零部件库存低于最小库存(${part.minStock})，请考虑补充`;
  }
  
  logger.info(`管理员为零部件 ${partId} 进行了出库操作，数量: ${quantity}`);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    message: '出库操作成功',
    data: {
      outboundRecord,
      currentStock: updatedPart.currentStock,
      stockWarning
    }
  };
};

/**
 * 获取库存交易记录
 * 
 * @param {Object} ctx - Koa上下文
 */
const getInventoryTransactions = async (ctx) => {
  const { page = 1, limit = 10, type, partId, startDate, endDate, operator } = ctx.query;
  
  // 构建查询条件
  const query = {};
  if (type) {
    query.type = type;
  }
  
  if (partId) {
    query.partId = partId;
  }
  
  if (startDate) {
    query.startDate = startDate;
  }
  
  if (endDate) {
    query.endDate = endDate;
  }
  
  if (operator) {
    query.operator = operator;
  }
  
  // 从数据库获取交易记录
  // 实际项目中替换为数据库查询
  const transactions = [
    {
      id: 'in1',
      partId: 'part1',
      partName: '机油滤清器',
      partCode: 'OIL-FIL-001',
      type: 'in',
      quantity: 50,
      previousStock: 70,
      newStock: 120,
      supplier: '汽配优选',
      purchasePrice: 28.5,
      batchNumber: 'B2023051001',
      remark: '常规进货',
      operator: '李管理',
      operatorId: 'user5',
      createdAt: '2023-05-10T10:45:00Z'
    },
    {
      id: 'out1',
      partId: 'part1',
      partName: '机油滤清器',
      partCode: 'OIL-FIL-001',
      type: 'out',
      quantity: 5,
      previousStock: 125,
      newStock: 120,
      workOrderId: 'wo5',
      mechanicId: 'mech2',
      remark: '用于车辆保养',
      operator: '李管理',
      operatorId: 'user5',
      createdAt: '2023-05-12T16:30:00Z'
    },
    {
      id: 'in2',
      partId: 'part2',
      partName: '火花塞',
      partCode: 'SPARK-001',
      type: 'in',
      quantity: 100,
      previousStock: 20,
      newStock: 120,
      supplier: '火花电子',
      purchasePrice: 20.0,
      batchNumber: 'B2023050501',
      remark: '批量采购',
      operator: '王管理',
      operatorId: 'user6',
      createdAt: '2023-05-05T09:20:00Z'
    },
    {
      id: 'out2',
      partId: 'part2',
      partName: '火花塞',
      partCode: 'SPARK-001',
      type: 'out',
      quantity: 40,
      previousStock: 120,
      newStock: 80,
      workOrderId: 'wo3',
      mechanicId: 'mech1',
      remark: '多辆车更换火花塞',
      operator: '王管理',
      operatorId: 'user6',
      createdAt: '2023-05-06T14:15:00Z'
    }
  ];
  
  // 应用筛选条件
  let filteredTransactions = transactions;
  
  if (query.type) {
    filteredTransactions = filteredTransactions.filter(t => t.type === query.type);
  }
  
  if (query.partId) {
    filteredTransactions = filteredTransactions.filter(t => t.partId === query.partId);
  }
  
  if (query.startDate) {
    const startDateObj = new Date(query.startDate);
    filteredTransactions = filteredTransactions.filter(t => new Date(t.createdAt) >= startDateObj);
  }
  
  if (query.endDate) {
    const endDateObj = new Date(query.endDate);
    filteredTransactions = filteredTransactions.filter(t => new Date(t.createdAt) <= endDateObj);
  }
  
  if (query.operator) {
    filteredTransactions = filteredTransactions.filter(t => t.operator.includes(query.operator));
  }
  
  // 计算总数量
  const total = filteredTransactions.length;
  
  // 统计信息
  const summary = {
    totalInQuantity: filteredTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.quantity, 0),
    totalOutQuantity: filteredTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.quantity, 0),
    totalInTransactions: filteredTransactions.filter(t => t.type === 'in').length,
    totalOutTransactions: filteredTransactions.filter(t => t.type === 'out').length
  };
  
  logger.info(`管理员查询了库存交易记录，返回 ${filteredTransactions.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
      transactions: filteredTransactions,
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
  listParts,
  getPartDetail,
  createPart,
  updatePart,
  deletePart,
  inventoryIn,
  inventoryOut,
  getInventoryTransactions
};