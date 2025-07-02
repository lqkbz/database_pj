const { User, MechanicProfile, WorkOrder, WorkOrderMechanic, Vehicle, WorkOrderMaterial, Part, Payment, InventoryTxn } = require('../../models');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Op } = require('sequelize');

const logger = createLogger('MechanicWorkOrders');

/**
 * @swagger
 * /api/mechanic/work-orders:
 *   get:
 *     summary: 获取当前技师的工单列表
 *     description: 获取当前登录技师的所有工单，支持分页和状态筛选
 *     tags: [Mechanic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, done, cancelled]
 *         description: 工单状态过滤
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
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
 *                   properties:
 *                     workOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           vehicleId:
 *                             type: string
 *                           vehicleInfo:
 *                             type: object
 *                           customerId:
 *                             type: string
 *                           customerInfo:
 *                             type: object
 *                           description:
 *                             type: string
 *                           trade:
 *                             type: string
 *                             enum: [engine, paint, electric]
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           acceptedAt:
 *                             type: string
 *                             format: date-time
 *                           actualCost:
 *                             type: number
 *                           isAssignedToMe:
 *                             type: boolean
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getMyWorkOrders = async (ctx) => {
  try {
    const { user } = ctx.state;
    const { status, page = 1, limit = 10 } = ctx.query;
    
    // 安全地解析分页参数，确保是有效数字
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    
    // 限制分页参数的范围
    const safePage = Math.max(1, pageNum);
    const safeLimit = Math.min(Math.max(1, limitNum), 100); // 最大100条记录
    const offset = (safePage - 1) * safeLimit;
    
    // 获取技师档案
    const mechanicProfile = await MechanicProfile.findOne({
      where: { mechanic_id: user.id }
    });
    
    if (!mechanicProfile) {
      throw createError.notFound('未找到技师档案');
    }
    
    // 构建基础查询条件
    let baseWhereCondition = {};
    if (status) {
      baseWhereCondition.status = status;
    }
    
    // 方案：分别查询技师已分配的工单和待分配的工单，然后合并
    
    // 1. 查询技师已分配的工单ID
    const assignedWorkOrderIds = await WorkOrderMechanic.findAll({
      where: { mechanic_id: mechanicProfile.mechanic_id },
      attributes: ['order_id'],
      raw: true
    });
    
    const assignedOrderIds = assignedWorkOrderIds.map(wo => wo.order_id);
    
    // 2. 构建查询条件
    let whereConditions = [];
    
    // 技师已分配的工单
    if (assignedOrderIds.length > 0) {
      whereConditions.push({
        order_id: { [Op.in]: assignedOrderIds },
        ...baseWhereCondition
      });
    }
    
    // 待分配的工单（只有在没有状态过滤或状态为pending时才包含）
    if (!status || status === 'pending') {
      whereConditions.push({
        status: 'pending',
        order_id: { [Op.notIn]: assignedOrderIds.length > 0 ? assignedOrderIds : [0] },
        ...baseWhereCondition
      });
    }
    
    // 如果没有符合条件的查询，返回空结果
    if (whereConditions.length === 0) {
      ctx.body = {
        status: 'success',
        data: {
          workOrders: [],
          pagination: {
            page: safePage,
            limit: safeLimit,
            total: 0,
            pages: 0
          }
        }
      };
      return;
    }
    
    // 3. 获取工单总数
    const total = await WorkOrder.count({
      where: {
        [Op.or]: whereConditions
      }
    });
    
    // 4. 获取工单列表
    const workOrders = await WorkOrder.findAll({
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
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
                  attributes: ['name']
                }
              ]
            }
          ],
          required: false
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['total_fee'],
          required: false
        }
      ],
      where: {
        [Op.or]: whereConditions
      },
      order: [['created_at', 'DESC']],
      limit: safeLimit,
      offset,
      distinct: true
    });
    
    // 5. 格式化工单数据
    const formattedWorkOrders = workOrders.map(wo => {
      const assignedMechanic = wo.mechanics.find(m => m.mechanic_id === mechanicProfile.mechanic_id);
      
      // 从Payment表获取总费用
      const actualCost = wo.payment ? parseFloat(wo.payment.total_fee) : null;
      
      return {
        id: wo.order_id,
        vehicleId: wo.vehicle_id,
        vehicleInfo: {
          model: wo.vehicle.model,
          licensePlate: wo.vehicle.plate_no,
          year: wo.vehicle.year,
          vin: wo.vehicle.vin
        },
        customerId: wo.customer_id,
        customerInfo: {
          name: wo.vehicle.owner.name
        },
        description: wo.description,
        trade: wo.trade,
        status: wo.status,
        createdAt: wo.created_at,
        acceptedAt: assignedMechanic?.created_at || null,
        actualCost: actualCost,
        isAssignedToMe: !!assignedMechanic
      };
    });
    
    logger.info(`技师 ${user.id} 查询了工单列表，状态: ${status || '全部'}，页码: ${safePage}，限制: ${safeLimit}，总数: ${total}`);
    
    ctx.body = {
      status: 'success',
      data: {
        workOrders: formattedWorkOrders,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit)
        }
      }
    };
  } catch (error) {
    logger.error(`获取技师工单列表失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('获取工单列表失败');
  }
};

/**
 * @swagger
 * /api/mechanic/work-orders/{id}/accept:
 *   post:
 *     summary: 接受工单
 *     description: 技师接受指定的工单
 *     tags: [Mechanic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工单ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: 备注说明
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
 *                 message:
 *                   type: string
 *                   example: 工单已接受
 *                 data:
 *                   type: object
 *                   properties:
 *                     workOrder:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 未找到工单
 *       409:
 *         description: 工单状态冲突
 *       500:
 *         description: 服务器错误
 */
const acceptWorkOrder = async (ctx) => {
  try {
    const { user } = ctx.state;
    const orderId = ctx.params.id;
    const { notes } = ctx.request.body || {};
    
    // 获取技师档案
    const mechanicProfile = await MechanicProfile.findOne({
      where: { mechanic_id: user.id }
    });
    
    if (!mechanicProfile) {
      throw createError.notFound('未找到技师档案');
    }
    
    // 获取工单信息
    const workOrder = await WorkOrder.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: WorkOrderMechanic,
          as: 'mechanics',
          required: false
        }
      ]
    });
    
    if (!workOrder) {
      throw createError.notFound('未找到该工单');
    }
    
    // 检查工单状态
    if (workOrder.status !== 'pending') {
      throw createError.conflict('该工单不可接受');
    }
    
    // 检查是否已有技师接受
    if (workOrder.mechanics && workOrder.mechanics.length > 0) {
      throw createError.conflict('该工单已被其他技师接受');
    }
    
    // 检查技师当前活跃工单数量
    const activeOrderCount = await WorkOrderMechanic.count({
      where: { mechanic_id: mechanicProfile.mechanic_id },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder',
          where: { status: 'in_progress' }
        }
      ]
    });
    
    const maxActiveOrders = 5; // 最大同时处理工单数
    if (activeOrderCount >= maxActiveOrders) {
      throw createError.conflict('您当前有太多活跃工单，请先完成一些现有工单');
    }
    
    // 开始事务
    const transaction = await WorkOrder.sequelize.transaction();
    
    try {
      // 更新工单状态
      await WorkOrder.update(
        { 
          status: 'in_progress'
        },
        { 
          where: { order_id: orderId },
          transaction
        }
      );
      
      // 创建技师工单关联记录
      const workOrderMechanic = await WorkOrderMechanic.create({
        order_id: orderId,
        mechanic_id: mechanicProfile.mechanic_id,
        note: notes || null,
        status: 'not_started'
      }, { transaction });
      
      await transaction.commit();
      
      logger.info(`技师 ${user.id} 接受了工单 ${orderId}`);
      
      ctx.body = {
        status: 'success',
        message: '工单已接受',
        data: {
          workOrder: {
            id: orderId,
            status: 'in_progress',
            acceptedAt: new Date(),
            mechanicId: mechanicProfile.mechanic_id
          }
        }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`接受工单失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('接受工单失败');
  }
};

/**
 * @swagger
 * /api/mechanic/work-orders/{id}/progress:
 *   post:
 *     summary: 更新工单进度
 *     description: 技师更新工单的进度和状态
 *     tags: [Mechanic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - progressNote
 *               - workStatus
 *               - hoursWorked
 *             properties:
 *               progressNote:
 *                 type: string
 *                 description: 进度备注
 *               workStatus:
 *                 type: string
 *                 enum: [not_started, in_progress, completed, paused]
 *                 description: 工作进度状态
 *               hoursWorked:
 *                 type: number
 *                 description: 实际工作时间
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
 *                 message:
 *                   type: string
 *                   example: 工单进度已更新
 *                 data:
 *                   type: object
 *                   properties:
 *                     progressUpdate:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权更新该工单
 *       404:
 *         description: 未找到工单
 *       409:
 *         description: 工单状态冲突
 *       500:
 *         description: 服务器错误
 */
const updateWorkOrderProgress = async (ctx) => {
  try {
    const { user } = ctx.state;
    const orderId = ctx.params.id;
    const { progressNote, workStatus, hoursWorked } = ctx.request.body;
    
    // 验证必需参数
    if (!progressNote) {
      throw createError.validation('必须提供进度备注');
    }
    
    if (!workStatus) {
      throw createError.validation('必须提供工作状态');
    }
    
    if (hoursWorked === undefined || hoursWorked === null) {
      throw createError.validation('必须提供工作时间');
    }
    
    // 验证工作状态
    const validStatuses = ['not_started', 'in_progress', 'completed', 'paused'];
    if (!validStatuses.includes(workStatus)) {
      throw createError.validation('工作状态必须是: not_started, in_progress, completed, paused 之一');
    }
    
    // 验证工作时间
    if (isNaN(hoursWorked) || hoursWorked < 0) {
      throw createError.validation('工作时间必须是非负数');
    }
    
    // 获取技师档案
    const mechanicProfile = await MechanicProfile.findOne({
      where: { mechanic_id: user.id }
    });
    
    if (!mechanicProfile) {
      throw createError.notFound('未找到技师档案');
    }
    
    // 获取工单和技师关联信息
    const workOrderMechanic = await WorkOrderMechanic.findOne({
      where: {
        order_id: orderId,
        mechanic_id: mechanicProfile.mechanic_id
      },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder'
        }
      ]
    });
    
    if (!workOrderMechanic) {
      throw createError.notFound('未找到该工单或您无权访问');
    }
    
    // 检查工单状态
    if (workOrderMechanic.workOrder.status !== 'in_progress') {
      throw createError.conflict('只能更新进行中的工单');
    }
    
    // 验证状态转换的有效性
    const currentStatus = workOrderMechanic.status || 'not_started';
    const validTransitions = {
      'not_started': ['in_progress'],
      'in_progress': ['completed', 'paused'],
      'paused': ['in_progress', 'completed'],
      'completed': [] // 已完成的工作不能转换到其他状态
    };
    
    if (!validTransitions[currentStatus].includes(workStatus)) {
      throw createError.validation(`无法从 ${currentStatus} 状态转换到 ${workStatus} 状态`);
    }
    
    // 准备更新数据
    const statusMessages = {
      'not_started': '重置为未开始',
      'in_progress': '开始工作',
      'completed': '完成工作',
      'paused': '暂停工作'
    };
    
    const newNote = `[${new Date().toLocaleString()}] ${progressNote}\n[${new Date().toLocaleString()}] 状态变更: ${statusMessages[workStatus]}`;
    
    const updateData = {
      note: workOrderMechanic.note ? 
        `${workOrderMechanic.note}\n${newNote}` : 
        newNote,
      status: workStatus,
      hours_worked: parseFloat(hoursWorked)
    };
    
    // 更新技师工单记录
    await WorkOrderMechanic.update(updateData, {
      where: {
        order_id: orderId,
        mechanic_id: mechanicProfile.mechanic_id
      }
    });
    
    logger.info(`技师 ${user.id} 更新了工单 ${orderId} 的进度，状态: ${workStatus}，工时: ${hoursWorked}`);
    
    ctx.body = {
      status: 'success',
      message: '工单进度已更新',
      data: {
        progressUpdate: {
          workOrderId: orderId,
          progressNote,
          workStatus,
          hoursWorked: parseFloat(hoursWorked),
          updatedAt: new Date()
        }
      }
    };
  } catch (error) {
    logger.error(`更新工单进度失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('更新工单进度失败');
  }
};

/**
 * @swagger
 * /api/mechanic/work-orders/{id}/materials:
 *   post:
 *     summary: 记录工单所用材料
 *     description: 技师记录工单维修过程中使用的材料
 *     tags: [Mechanic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - materials
 *             properties:
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - partId
 *                     - quantity
 *                   properties:
 *                     partId:
 *                       type: string
 *                       description: 配件ID
 *                     quantity:
 *                       type: number
 *                       description: 数量
 *                     notes:
 *                       type: string
 *                       description: 备注
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
 *                 message:
 *                   type: string
 *                   example: 材料记录已添加
 *                 data:
 *                   type: object
 *                   properties:
 *                     materialRecord:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权为该工单添加材料
 *       404:
 *         description: 未找到工单
 *       409:
 *         description: 工单状态冲突
 *       500:
 *         description: 服务器错误
 */
const recordWorkOrderMaterials = async (ctx) => {
  try {
    const { user } = ctx.state;
    const orderId = ctx.params.id;
    const { materials } = ctx.request.body;
    
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      throw createError.validation('必须提供有效的材料列表');
    }
    
    // 验证材料数据
    for (const material of materials) {
      if (!material.partId || !material.quantity) {
        throw createError.validation('每个材料必须包含配件ID和数量');
      }
      
      if (isNaN(material.quantity) || material.quantity <= 0) {
        throw createError.validation('材料数量必须大于0');
      }
    }
    
    // 获取技师档案
    const mechanicProfile = await MechanicProfile.findOne({
      where: { mechanic_id: user.id }
    });
    
    if (!mechanicProfile) {
      throw createError.notFound('未找到技师档案');
    }
    
    // 检查工单和技师关联
    const workOrderMechanic = await WorkOrderMechanic.findOne({
      where: {
        order_id: orderId,
        mechanic_id: mechanicProfile.mechanic_id
      },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder'
        }
      ]
    });
    
    if (!workOrderMechanic) {
      throw createError.notFound('未找到该工单或您无权访问');
    }
    
    // 检查工单状态
    if (workOrderMechanic.workOrder.status !== 'in_progress') {
      throw createError.conflict('只能为进行中的工单添加材料');
    }
    
    // 开始事务
    const transaction = await WorkOrder.sequelize.transaction();
    
    try {
      const addedMaterials = [];
      let totalMaterialCost = 0;
      
      for (const material of materials) {
        // 获取配件信息
        const part = await Part.findOne({
          where: { part_id: material.partId },
          transaction
        });
        
        if (!part) {
          throw createError.notFound(`未找到配件 ${material.partId}`);
        }
        
        // 检查库存（修复变量名）
        if (part.qty < material.quantity) {
          throw createError.validation(`配件 ${part.name} 库存不足，当前库存: ${part.qty}`);
        }
        
        // 计算费用（修复变量名）
        const unitPrice = parseFloat(part.unit_cost);
        const quantity = parseFloat(material.quantity);
        const totalPrice = unitPrice * quantity;
        totalMaterialCost += totalPrice;
        
        // 创建工单材料记录
        const workOrderMaterial = await WorkOrderMaterial.create({
          order_id: orderId,
          part_id: material.partId,
          qty: quantity,
          price: unitPrice
        }, { transaction });
        
        // 更新配件库存（修复变量名）
        await Part.update(
          { 
            qty: part.qty - quantity
          },
          { 
            where: { part_id: material.partId },
            transaction
          }
        );
        
        // 记录库存交易流水（新增）
        await InventoryTxn.create({
          part_id: material.partId,
          order_id: orderId,
          qty: -quantity, // 负数表示出库
          type: 'OUT'
        }, { transaction });
        
        addedMaterials.push({
          partId: material.partId,
          partName: part.name,
          quantity,
          unitPrice,
          totalPrice: parseFloat(totalPrice.toFixed(2))
        });
      }
      
      await transaction.commit();
      
      logger.info(`技师 ${user.id} 为工单 ${orderId} 记录了材料，总价: ${totalMaterialCost.toFixed(2)}`);
      
      ctx.body = {
        status: 'success',
        message: '材料记录已添加',
        data: {
          materialRecord: {
            workOrderId: orderId,
            materials: addedMaterials,
            totalMaterialCost: parseFloat(totalMaterialCost.toFixed(2)),
            recordedAt: new Date()
          }
        }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`记录工单材料失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('记录工单材料失败');
  }
};

/**
 * @swagger
 * /api/mechanic/work-orders/{id}/complete:
 *   post:
 *     summary: 完成工单
 *     description: 技师标记工单为已完成，系统自动计算费用并创建支付记录
 *     tags: [Mechanic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工单ID
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
 *                 message:
 *                   type: string
 *                   example: 工单已完成
 *                 data:
 *                   type: object
 *                   properties:
 *                     workOrder:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权完成该工单
 *       404:
 *         description: 未找到工单
 *       409:
 *         description: 工单状态冲突
 *       500:
 *         description: 服务器错误
 */
const completeWorkOrder = async (ctx) => {
  try {
    const { user } = ctx.state;
    const orderId = ctx.params.id;
    
    // 获取技师档案
    const mechanicProfile = await MechanicProfile.findOne({
      where: { mechanic_id: user.id }
    });
    
    if (!mechanicProfile) {
      throw createError.notFound('未找到技师档案');
    }
    
    // 获取工单和相关信息
    const workOrderMechanic = await WorkOrderMechanic.findOne({
      where: {
        order_id: orderId,
        mechanic_id: mechanicProfile.mechanic_id
      },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder',
          include: [
            {
              model: WorkOrderMaterial,
              as: 'materials',
              include: [
                {
                  model: Part,
                  as: 'part'
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!workOrderMechanic) {
      throw createError.notFound('未找到该工单或您无权访问');
    }
    
    // 检查工单状态
    if (workOrderMechanic.workOrder.status !== 'in_progress') {
      throw createError.conflict('只能完成进行中的工单');
    }
    
    // 检查技师工作状态（临时适配旧枚举值）
    const validWorkingStatuses = ['in_progress']; // 在旧枚举中，accepted表示正在工作
    if (!validWorkingStatuses.includes(workOrderMechanic.status)) {
      throw createError.conflict('技师工作状态必须为工作中才能完成工单');
    }
    
    // 计算费用
    const hoursWorked = parseFloat(workOrderMechanic.hours_worked) || 0;
    const hourlyRate = parseFloat(mechanicProfile.hourly_rate) || 0;
    const laborFee = hoursWorked * hourlyRate;
    
    // 计算材料费用
    let materialCost = 0;
    if (workOrderMechanic.workOrder.materials && workOrderMechanic.workOrder.materials.length > 0) {
      materialCost = workOrderMechanic.workOrder.materials.reduce((sum, material) => {
        const quantity = parseFloat(material.qty) || 0;
        const unitPrice = parseFloat(material.price) || 0;
        return sum + (quantity * unitPrice);
      }, 0);
    }
    
    const totalCost = laborFee + materialCost;
    
    // 开始事务
    const transaction = await WorkOrder.sequelize.transaction();
    
    try {
      // 1. 更新工单状态为已完成
      await WorkOrder.update({
        status: 'done',
        finished_at: new Date()
      }, {
        where: { order_id: orderId },
        transaction
      });
      
      // 2. 更新技师工单记录状态
      await WorkOrderMechanic.update({
        status: 'completed',
        note: workOrderMechanic.note ? 
          `${workOrderMechanic.note}\n[${new Date().toLocaleString()}] 工单完成` : 
          `[${new Date().toLocaleString()}] 工单完成`
      }, {
        where: {
          order_id: orderId,
          mechanic_id: mechanicProfile.mechanic_id
        },
        transaction
      });
      
      // 3. 确认所有材料使用（在work_order_materials中更新最终价格）
      if (workOrderMechanic.workOrder.materials && workOrderMechanic.workOrder.materials.length > 0) {
        for (const material of workOrderMechanic.workOrder.materials) {
          // 确认材料最终价格（如果需要的话可以做价格调整）
          await WorkOrderMaterial.update({
            // 这里可以添加确认状态或最终价格调整的逻辑
            // 目前保持原有价格不变
          }, {
            where: {
              order_id: orderId,
              part_id: material.part_id
            },
            transaction
          });
        }
      }
      
      // 4. 创建支付记录（paid_at为空，表示待支付）
      await Payment.create({
        order_id: orderId,
        labor_fee: laborFee,
        material_fee: materialCost,
        total_fee: totalCost,
        paid_at: null // 空值表示待支付
      }, { transaction });
      
      await transaction.commit();
      
      logger.info(`技师 ${user.id} 完成了工单 ${orderId}，工时: ${hoursWorked}h，时薪: ${hourlyRate}，人工费: ${laborFee.toFixed(2)}，材料费: ${materialCost.toFixed(2)}，总费用: ${totalCost.toFixed(2)}`);
      
      const completedWorkOrder = {
        id: orderId,
        status: 'done',
        completedAt: new Date(),
        hoursWorked: hoursWorked,
        hourlyRate: hourlyRate,
        laborCost: parseFloat(laborFee.toFixed(2)),
        materialCost: parseFloat(materialCost.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        mechanicId: mechanicProfile.mechanic_id
      };
      
      ctx.body = {
        status: 'success',
        message: '工单已完成',
        data: {
          workOrder: completedWorkOrder
        }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`完成工单失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('完成工单失败');
  }
};

module.exports = {
  getMyWorkOrders,
  acceptWorkOrder,
  updateWorkOrderProgress,
  recordWorkOrderMaterials,
  completeWorkOrder
};
