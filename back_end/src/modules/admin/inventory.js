const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Part, InventoryTxn, WorkOrder, User } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminInventory');

/**
 * @swagger
 * /api/admin/inventory/parts:
 *   get:
 *     summary: 获取配件库存列表
 *     description: 获取所有配件的库存信息，支持搜索和过滤
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
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词（配件名称）
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: 仅显示库存不足的配件
 *       - in: query
 *         name: unit
 *         schema:
 *           type: string
 *           enum: [pcs, L, kg]
 *         description: 计量单位过滤
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
 *                     parts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getInventoryList = async (ctx) => {
  const { page = 1, limit = 10, search, lowStock, unit } = ctx.query;
  
  try {
  // 构建查询条件
    const whereClause = {};
    
  if (search) {
      whereClause.name = {
        [Op.like]: `%${search}%`
      };
  }
  
    if (unit) {
      whereClause.unit = unit;
  }
  
    // 查询配件列表，包含库存信息
    const { count, rows: parts } = await Part.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InventoryTxn,
          as: 'inventoryTransactions',
          attributes: []
        }
      ],
      attributes: [
        'part_id',
        'name',
        'unit',
        'unit_cost',
        [Part.sequelize.fn('COALESCE', Part.sequelize.fn('SUM', Part.sequelize.col('inventoryTransactions.qty')), 0), 'current_stock']
      ],
      group: ['part_id'],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['name', 'ASC']]
    });

    // 如果只显示库存不足的配件
    let filteredParts = parts;
    if (lowStock === 'true') {
      filteredParts = parts.filter(part => {
        const stock = parseInt(part.getDataValue('current_stock')) || 0;
        return stock < 10; // 默认库存阈值为10
      });
    }

    // 处理数据
    const processedParts = filteredParts.map(part => ({
      id: part.part_id,
      name: part.name,
      unit: part.unit,
      unitCost: parseFloat(part.unit_cost),
      currentStock: parseInt(part.getDataValue('current_stock')) || 0,
      stockStatus: (parseInt(part.getDataValue('current_stock')) || 0) < 10 ? 'low' : 'normal'
    }));
  
    logger.info(`管理员查询了配件库存列表，返回 ${processedParts.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
        parts: processedParts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取配件库存列表失败:', error);
    throw createError.internal('获取配件库存列表失败');
    }
};

/**
 * @swagger
 * /api/admin/inventory/parts:
 *   post:
 *     summary: 添加新配件
 *     description: 在系统中添加新的配件信息
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unit
 *               - unitCost
 *             properties:
 *               name:
 *                 type: string
 *                 description: 配件名称
 *               unit:
 *                 type: string
 *                 enum: [pcs, L, kg]
 *                 description: 计量单位
 *               unitCost:
 *                 type: number
 *                 description: 单位成本
 *               initialStock:
 *                 type: integer
 *                 description: 初始库存数量
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const addPart = async (ctx) => {
  const { name, unit, unitCost, initialStock = 0 } = ctx.request.body;
  
  try {
  // 验证必填字段
    const requiredFields = ['name', 'unit', 'unitCost'];
  
  for (const field of requiredFields) {
      if (!ctx.request.body[field]) {
      throw createError.validation(`缺少必填字段: ${field}`);
    }
  }
  
    // 验证计量单位
    if (!['pcs', 'L', 'kg'].includes(unit)) {
      throw createError.validation('无效的计量单位');
  }
  
    // 验证成本
    if (isNaN(unitCost) || unitCost < 0) {
      throw createError.validation('单位成本必须是非负数');
  }
  
    // 检查配件名称是否已存在
    const existingPart = await Part.findOne({ where: { name } });
    if (existingPart) {
      throw createError.conflict('配件名称已存在');
  }
  
    // 使用事务创建配件和初始库存记录
    const result = await Part.sequelize.transaction(async (t) => {
      // 创建配件
      const part = await Part.create({
        name,
        unit,
        unit_cost: unitCost
      }, { transaction: t });
      
      // 如果有初始库存，创建入库记录
      if (initialStock > 0) {
        await InventoryTxn.create({
          part_id: part.part_id,
          txn_type: 'in',
          qty: initialStock,
          unit_cost: unitCost,
          total_cost: unitCost * initialStock,
          order_id: null,
          operator_id: ctx.state.user?.id || null,
          note: '初始库存'
        }, { transaction: t });
      }
      
      return part;
    });
  
    logger.info(`管理员添加了新配件: ${name} (ID: ${result.part_id})`);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
      message: '配件添加成功',
    data: {
        part: {
          id: result.part_id,
          name: result.name,
          unit: result.unit,
          unitCost: parseFloat(result.unit_cost),
          currentStock: initialStock
        }
    }
  };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error('添加配件失败:', error);
    throw createError.internal('添加配件失败');
  }
};

/**
 * @swagger
 * /api/admin/inventory/parts/{id}:
 *   patch:
 *     summary: 更新配件信息
 *     description: 更新指定配件的基本信息
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 配件ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 配件名称
 *               unit:
 *                 type: string
 *                 enum: [pcs, L, kg]
 *                 description: 计量单位
 *               unitCost:
 *                 type: number
 *                 description: 单位成本
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 配件不存在
 *       500:
 *         description: 服务器错误
 */
const updatePart = async (ctx) => {
  const partId = ctx.params.id;
  const updateData = ctx.request.body;
  
  try {
    // 获取配件信息
    const part = await Part.findByPk(partId);
  
  if (!part) {
      throw createError.notFound('配件不存在');
  }
  
  // 验证更新数据
    const allowedFields = ['name', 'unit', 'unit_cost'];
  const updates = {};
  
  Object.keys(updateData).forEach(key => {
      const mappedKey = key === 'unitCost' ? 'unit_cost' : key;
      if (allowedFields.includes(mappedKey)) {
        updates[mappedKey] = updateData[key];
    }
  });
  
  if (Object.keys(updates).length === 0) {
    throw createError.validation('没有提供有效的更新字段');
  }
  
  // 特殊字段验证
    if (updates.unit && !['pcs', 'L', 'kg'].includes(updates.unit)) {
      throw createError.validation('无效的计量单位');
  }
  
    if (updates.unit_cost && (isNaN(updates.unit_cost) || updates.unit_cost < 0)) {
      throw createError.validation('单位成本必须是非负数');
  }
  
    // 检查名称唯一性（如果要更新名称）
    if (updates.name && updates.name !== part.name) {
      const existingPart = await Part.findOne({ where: { name: updates.name } });
      if (existingPart) {
        throw createError.conflict('配件名称已存在');
      }
  }
  
    // 更新配件信息
    await part.update(updates);
  
    logger.info(`管理员更新了配件 ${partId} 的信息`);
  
  ctx.body = {
    status: 'success',
      message: '配件信息已更新',
    data: {
      partId,
      updatedFields: Object.keys(updates)
    }
  };
  } catch (error) {
    if (error.status) {
      throw error;
  }
    logger.error(`更新配件信息失败 (ID: ${partId}):`, error);
    throw createError.internal('更新配件信息失败');
  }
};

/**
 * @swagger
 * /api/admin/inventory/transactions:
 *   post:
 *     summary: 记录库存交易
 *     description: 记录配件的入库或出库交易
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partId
 *               - type
 *               - quantity
 *               - unitCost
 *             properties:
 *               partId:
 *                 type: string
 *                 description: 配件ID
 *               type:
 *                 type: string
 *                 enum: [in, out]
 *                 description: 交易类型（入库/出库）
 *               quantity:
 *                 type: integer
 *                 description: 数量
 *               unitCost:
 *                 type: number
 *                 description: 单位成本
 *               orderId:
 *                 type: string
 *                 description: 关联工单ID（出库时）
 *               note:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const recordTransaction = async (ctx) => {
  const { partId, type, quantity, unitCost, orderId, note } = ctx.request.body;
  
  try {
  // 验证必填字段
    const requiredFields = ['partId', 'type', 'quantity', 'unitCost'];
    
    for (const field of requiredFields) {
      if (!ctx.request.body[field]) {
        throw createError.validation(`缺少必填字段: ${field}`);
  }
    }
    
    // 验证交易类型
    if (!['in', 'out'].includes(type)) {
      throw createError.validation('无效的交易类型');
    }
    
    // 验证数量和成本
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw createError.validation('数量必须是正整数');
  }
  
    if (isNaN(unitCost) || unitCost < 0) {
      throw createError.validation('单位成本必须是非负数');
  }
  
    // 检查配件是否存在
    const part = await Part.findByPk(partId);
  if (!part) {
      throw createError.notFound('配件不存在');
  }
  
    // 如果是出库，检查库存是否充足
    if (type === 'out') {
      const currentStock = await part.getCurrentStock();
      if (currentStock < quantity) {
        throw createError.validation(`库存不足，当前库存: ${currentStock}`);
      }
  }
  
    // 如果指定了工单ID，验证工单是否存在
    if (orderId) {
      const workOrder = await WorkOrder.findByPk(orderId);
      if (!workOrder) {
        throw createError.notFound('工单不存在');
      }
    }
    
    // 创建库存交易记录
    const transaction = await InventoryTxn.create({
      part_id: partId,
      txn_type: type,
      qty: type === 'out' ? -quantity : quantity,
      unit_cost: unitCost,
      total_cost: unitCost * quantity,
      order_id: orderId || null,
      operator_id: ctx.state.user?.id || null,
      note: note || null
    });
    
    logger.info(`管理员记录了库存交易: 配件${partId} ${type === 'in' ? '入库' : '出库'} ${quantity}`);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
      message: '库存交易记录成功',
    data: {
        transaction: {
          id: transaction.txn_id,
          partId: transaction.part_id,
          type: transaction.txn_type,
          quantity: Math.abs(transaction.qty),
          unitCost: parseFloat(transaction.unit_cost),
          totalCost: parseFloat(transaction.total_cost),
          createdAt: transaction.created_at
        }
    }
  };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error('记录库存交易失败:', error);
    throw createError.internal('记录库存交易失败');
  }
};

/**
 * @swagger
 * /api/admin/inventory/parts/{id}/transactions:
 *   get:
 *     summary: 获取配件交易历史
 *     description: 获取指定配件的所有库存交易记录
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 配件ID
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
 *       404:
 *         description: 配件不存在
 *       500:
 *         description: 服务器错误
 */
const getPartTransactions = async (ctx) => {
  const partId = ctx.params.id;
  const { page = 1, limit = 10 } = ctx.query;
  
  try {
    // 检查配件是否存在
    const part = await Part.findByPk(partId);
    if (!part) {
      throw createError.notFound('配件不存在');
    }
    
    // 获取交易历史
    const { count, rows: transactions } = await InventoryTxn.findAndCountAll({
      where: { part_id: partId },
      include: [
        {
          model: User,
          as: 'operator',
          attributes: ['user_id', 'name'],
          required: false
        },
        {
          model: WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description'],
          required: false
        }
      ],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    // 处理数据
    const processedTransactions = transactions.map(txn => ({
      id: txn.txn_id,
      type: txn.txn_type,
      quantity: Math.abs(txn.qty),
      unitCost: parseFloat(txn.unit_cost),
      totalCost: parseFloat(txn.total_cost),
      orderId: txn.order_id,
      orderDescription: txn.workOrder?.description || null,
      operatorId: txn.operator_id,
      operatorName: txn.operator?.name || null,
      note: txn.note,
      createdAt: txn.created_at
    }));
  
  ctx.body = {
    status: 'success',
    data: {
        part: {
          id: part.part_id,
          name: part.name,
          unit: part.unit,
          unitCost: parseFloat(part.unit_cost)
        },
        transactions: processedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`获取配件交易历史失败 (ID: ${partId}):`, error);
    throw createError.internal('获取配件交易历史失败');
  }
};

module.exports = {
  getInventoryList,
  addPart,
  updatePart,
  recordTransaction,
  getPartTransactions
};