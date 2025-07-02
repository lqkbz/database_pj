const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Vehicle, WorkOrder, User, WorkOrderMechanic, MechanicProfile, WorkOrderMaterial, Part } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminVehiclesWorkOrders');

/**
 * @swagger
 * /api/admin/vehicles:
 *   get:
 *     summary: 获取车辆列表（管理员视图）
 *     description: 获取系统中所有车辆的列表，支持分页和搜索
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
 *         description: 搜索关键词（车牌号、品牌型号等）
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *         description: 车辆品牌
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: 车主姓名
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
 *                     vehicles:
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
const listVehicles = async (ctx) => {
  const { page = 1, limit = 10, search, make, owner } = ctx.query;
  
  try {
    // 构建查询条件
    const whereClause = {};
    const userWhereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { plate_no: { [Op.like]: `%${search}%` } },
        { make: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (make) {
      whereClause.make = { [Op.like]: `%${make}%` };
    }
    
    if (owner) {
      userWhereClause.name = { [Op.like]: `%${owner}%` };
    }
    
    // 查询车辆列表
    const { count, rows: vehicles } = await Vehicle.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'owner',
          where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined,
          attributes: ['user_id', 'name'],
          required: true
        },
        {
          model: WorkOrder,
          as: 'workOrders',
          attributes: ['order_id'],
          required: false
        }
      ],
      attributes: ['vehicle_id', 'make', 'model', 'year', 'plate_no', 'vin', 'created_at'],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    // 处理数据
    const processedVehicles = vehicles.map(vehicle => ({
      id: vehicle.vehicle_id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.plate_no,
      vin: vehicle.vin,
      owner: {
        id: vehicle.owner.user_id,
        name: vehicle.owner.name
      },
      orderCount: vehicle.workOrders ? vehicle.workOrders.length : 0,
      createdAt: vehicle.created_at
    }));
    
    logger.info(`管理员查询了车辆列表，返回 ${vehicles.length} 条记录`);
    
    ctx.body = {
      status: 'success',
      data: {
        vehicles: processedVehicles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取车辆列表失败:', error);
    throw createError.internal('获取车辆列表失败');
  }
};

/**
 * @swagger
 * /api/admin/work-orders:
 *   get:
 *     summary: 获取所有工单列表（管理员视图）
 *     description: 获取系统中所有工单的列表，支持分页和多种过滤条件
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
 *           enum: [pending, assigned, in_progress, done, cancel]
 *         description: 工单状态
 *       - in: query
 *         name: mechanic
 *         schema:
 *           type: string
 *         description: 技师ID
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: 客户ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期 (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
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
 *                   properties:
 *                     workOrders:
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
const listWorkOrders = async (ctx) => {
  const { page = 1, limit = 10, status, mechanic, customer, dateFrom, dateTo } = ctx.query;
  
  try {
    // 构建查询条件
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (customer) {
      whereClause.customer_id = customer;
    }
    
    if (dateFrom && dateTo) {
      whereClause.created_at = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      };
    } else if (dateFrom) {
      whereClause.created_at = {
        [Op.gte]: new Date(dateFrom)
      };
    } else if (dateTo) {
      whereClause.created_at = {
        [Op.lte]: new Date(dateTo)
      };
    }

    // 如果按技师筛选，需要通过WorkOrderMechanic表
    let includeConditions = [
      {
        model: Vehicle,
        as: 'vehicle',
        attributes: ['vehicle_id', 'make', 'model', 'plate_no'],
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['user_id', 'name']
          }
        ]
      }
    ];

    if (mechanic) {
      includeConditions.push({
        model: WorkOrderMechanic,
        as: 'mechanics',
        where: { mechanic_id: mechanic },
        attributes: ['mechanic_id'],
        required: true
      });
    }
    
    // 查询工单列表
    const { count, rows: workOrders } = await WorkOrder.findAndCountAll({
      where: whereClause,
      include: includeConditions,
      attributes: ['order_id', 'status', 'description', 'created_at', 'finished_at'],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    // 处理数据
    const processedWorkOrders = workOrders.map(order => ({
      id: order.order_id,
      description: order.description,
      status: order.status,
      createdAt: order.created_at,
      finishedAt: order.finished_at,
      vehicle: {
        id: order.vehicle.vehicle_id,
        make: order.vehicle.make,
        model: order.vehicle.model,
        licensePlate: order.vehicle.plate_no
      },
      customer: {
        id: order.vehicle.owner.user_id,
        name: order.vehicle.owner.name
      }
    }));
    
    logger.info(`管理员查询了工单列表，返回 ${workOrders.length} 条记录`);
    
    ctx.body = {
      status: 'success',
      data: {
        workOrders: processedWorkOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取工单列表失败:', error);
    throw createError.internal('获取工单列表失败');
  }
};

/**
 * @swagger
 * /api/admin/work-orders/{id}:
 *   get:
 *     summary: 获取工单详情（管理员视图）
 *     description: 获取指定工单的详细信息，包括客户、技师、车辆、维修历史等
 *     tags: [Admin]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     workOrder:
 *                       type: object
 *       401:
 *         description: 未授权
 *       404:
 *         description: 工单不存在
 *       500:
 *         description: 服务器错误
 */
const getWorkOrderDetail = async (ctx) => {
  const orderId = ctx.params.id;
  
  try {
    // 从数据库获取工单详情
    const workOrder = await WorkOrder.findByPk(orderId, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['vehicle_id', 'make', 'model', 'year', 'plate_no', 'vin'],
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
                  attributes: ['user_id', 'name']
                }
              ]
            }
          ]
        },
        {
          model: WorkOrderMaterial,
          as: 'materials',
          include: [
            {
              model: Part,
              as: 'part',
              attributes: ['part_id', 'name', 'unit']
            }
          ]
        }
      ]
    });
    
    if (!workOrder) {
      throw createError.notFound('工单不存在');
    }

    // 计算总费用
    const costBreakdown = await workOrder.calculateTotalCost();

    const workOrderDetail = {
      id: workOrder.order_id,
      description: workOrder.description,
      status: workOrder.status,
      createdAt: workOrder.created_at,
      finishedAt: workOrder.finished_at,
      cancelReason: workOrder.cancel_reason,
      vehicle: {
        id: workOrder.vehicle.vehicle_id,
        make: workOrder.vehicle.make,
        model: workOrder.vehicle.model,
        year: workOrder.vehicle.year,
        licensePlate: workOrder.vehicle.plate_no,
        vin: workOrder.vehicle.vin
      },
      customer: {
        id: workOrder.vehicle.owner.user_id,
        name: workOrder.vehicle.owner.name
      },
      mechanics: workOrder.mechanics.map(wom => ({
        id: wom.mechanic.user.user_id,
        name: wom.mechanic.user.name,
        trade: wom.mechanic.trade,
        hoursWorked: wom.hours_worked,
        status: wom.status,
        note: wom.note,
        acceptedAt: wom.accepted_at
      })),
      materials: workOrder.materials.map(wom => ({
        id: wom.part.part_id,
        name: wom.part.name,
        unit: wom.part.unit,
        quantity: wom.qty,
        unitPrice: parseFloat(wom.price),
        totalPrice: parseFloat(wom.price) * wom.qty
      })),
      costBreakdown: {
        materialCost: costBreakdown.material_cost,
        laborCost: costBreakdown.labor_cost,
        totalCost: costBreakdown.material_cost + costBreakdown.labor_cost
      }
    };
    
    logger.info(`管理员查看了工单 ${orderId} 的详细信息`);
    
    ctx.body = {
      status: 'success',
      data: {
        workOrder: workOrderDetail
      }
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`获取工单详情失败 (ID: ${orderId}):`, error);
    throw createError.internal('获取工单详情失败');
  }
};

/**
 * @swagger
 * /api/admin/work-orders/{id}:
 *   patch:
 *     summary: 更新工单信息（管理员操作）
 *     description: 管理员更新工单的状态、描述等信息
 *     tags: [Admin]
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, in_progress, done, cancel]
 *                 description: 工单状态
 *               description:
 *                 type: string
 *                 description: 工单描述
 *               cancelReason:
 *                 type: string
 *                 description: 取消原因（状态为cancel时）
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
 *                 data:
 *                   type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 工单不存在
 *       500:
 *         description: 服务器错误
 */
const updateWorkOrder = async (ctx) => {
  const orderId = ctx.params.id;
  const updateData = ctx.request.body;
  
  try {
    // 获取工单信息
    const workOrder = await WorkOrder.findByPk(orderId);
    
    if (!workOrder) {
      throw createError.notFound('工单不存在');
    }
    
    // 验证更新数据
    const allowedFields = ['status', 'description', 'cancel_reason'];
    const updates = {};
    
    Object.keys(updateData).forEach(key => {
      const mappedKey = key === 'cancelReason' ? 'cancel_reason' : key;
      if (allowedFields.includes(mappedKey)) {
        updates[mappedKey] = updateData[key];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      throw createError.validation('没有提供有效的更新字段');
    }
    
    // 特殊字段验证
    if (updates.status && !['pending', 'assigned', 'in_progress', 'done', 'cancel'].includes(updates.status)) {
      throw createError.validation('无效的状态值');
    }
    
    // 如果设置为完成状态，自动设置完成时间
    if (updates.status === 'done' && !workOrder.finished_at) {
      updates.finished_at = new Date();
    }
    
    // 更新工单信息
    await workOrder.update(updates);
    
    logger.info(`管理员更新了工单 ${orderId} 的信息`);
    
    ctx.body = {
      status: 'success',
      message: '工单信息已更新',
      data: {
        orderId,
        updatedFields: Object.keys(updates)
      }
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`更新工单信息失败 (ID: ${orderId}):`, error);
    throw createError.internal('更新工单信息失败');
  }
};

/**
 * @swagger
 * /api/admin/work-orders/{id}:
 *   delete:
 *     summary: 删除工单（管理员操作）
 *     description: 管理员删除指定的工单，仅允许删除待处理或已取消的工单
 *     tags: [Admin]
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
 *       401:
 *         description: 未授权
 *       404:
 *         description: 工单不存在
 *       409:
 *         description: 工单状态不允许删除
 *       500:
 *         description: 服务器错误
 */
const deleteWorkOrder = async (ctx) => {
  const orderId = ctx.params.id;
  
  try {
    // 获取工单信息
    const workOrder = await WorkOrder.findByPk(orderId);
    
    if (!workOrder) {
      throw createError.notFound('工单不存在');
    }
    
    // 检查工单状态，只允许删除待处理或已取消的工单
    if (!['pending', 'cancel'].includes(workOrder.status)) {
      throw createError.conflict(`状态为 ${workOrder.status} 的工单不能删除，请先取消工单`);
    }
    
    // 使用事务删除工单及相关记录
    await WorkOrder.sequelize.transaction(async (t) => {
      // 删除关联的技师分配记录
      await WorkOrderMechanic.destroy({
        where: { order_id: orderId },
        transaction: t
      });
      
      // 删除关联的材料使用记录
      await WorkOrderMaterial.destroy({
        where: { order_id: orderId },
        transaction: t
      });
      
      // 删除工单
      await workOrder.destroy({ transaction: t });
    });
    
    logger.info(`管理员删除了工单 ${orderId}`);
    
    ctx.body = {
      status: 'success',
      message: '工单已删除'
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`删除工单失败 (ID: ${orderId}):`, error);
    throw createError.internal('删除工单失败');
  }
};

module.exports = {
  listVehicles,
  listWorkOrders,
  getWorkOrderDetail,
  updateWorkOrder,
  deleteWorkOrder
};