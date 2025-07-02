const { WorkOrder, Vehicle, User, WorkOrderMechanic, MechanicProfile, WorkOrderMaterial, Part, Feedback, Payment } = require('../../models');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Op } = require('sequelize');

const logger = createLogger('WorkOrders');

/**
 * @swagger
 * /api/customers/work-orders:
 *   get:
 *     summary: 获取当前客户的所有工单
 *     description: 获取当前登录客户的所有维修工单，支持分页和状态筛选
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, in_progress, done, cancelled]
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
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           estimatedCompletionTime:
 *                             type: string
 *                             format: date-time
 *                           mechanicId:
 *                             type: string
 *                           mechanicName:
 *                             type: string
 *                           totalCost:
 *                             type: number
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
    
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const offset = (pageNum - 1) * pageSize;
    
    // 构建查询条件
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    
    // 从数据库获取用户的工单
    const { count, rows: workOrders } = await WorkOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          where: { user_id: user.id },
          attributes: ['vehicle_id', 'model', 'plate_no'],
          required: true
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
      attributes: ['order_id', 'description', 'trade', 'status', 'created_at', 'finished_at'],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset
    });
    
    // 格式化返回数据
    const formattedWorkOrders = workOrders.map(order => {
      const mechanic = order.mechanics && order.mechanics.length > 0 ? order.mechanics[0] : null;
      
      return {
        id: order.order_id,
        vehicleId: order.vehicle.vehicle_id,
        vehicleInfo: {
          model: order.vehicle.model,
          licensePlate: order.vehicle.plate_no
        },
        description: order.description,
        trade: order.trade,
        status: order.status,
        createdAt: order.created_at,
        finishedAt: order.finished_at,
        estimatedCompletionTime: order.estimated_completion_time,
        mechanicId: mechanic ? mechanic.mechanic.user.user_id : null,
        mechanicName: mechanic ? mechanic.mechanic.user.name : null,
        totalCost: order.payment ? parseFloat(order.payment.total_fee) : null
      };
    });
    
    logger.info(`用户 ${user.id} 获取了工单列表，共 ${count} 个工单`);
    
    ctx.body = {
      status: 'success',
      data: {
        workOrders: formattedWorkOrders,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: count,
          pages: Math.ceil(count / pageSize)
        }
      }
    };
  } catch (error) {
    logger.error(`获取工单列表失败: ${error.message}`);
    throw createError.internal('获取工单列表失败');
  }
};

/**
 * @swagger
 * /api/customers/work-orders:
 *   post:
 *     summary: 创建新工单
 *     description: 为当前登录客户创建新的维修工单
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - description
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 description: 车辆ID
 *               description:
 *                 type: string
 *                 description: 问题描述
 *               trade:
 *                 type: string
 *                 enum: [engine, paint, electric]
 *                 description: 指定技师工种（可选，默认为engine）
 *               urgency:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *                 description: 紧急程度
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
 *                   example: 工单创建成功
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
 *         description: 无权为该车辆创建工单
 *       404:
 *         description: 未找到车辆
 *       409:
 *         description: 车辆已有未完成工单
 *       500:
 *         description: 服务器错误
 */
const createWorkOrder = async (ctx) => {
  try {
    const { user } = ctx.state;
    const orderData = ctx.request.body;
    
    // 验证工单数据
    const requiredFields = ['vehicleId', 'description'];
    
    for (const field of requiredFields) {
      if (!orderData[field]) {
        throw createError.validation(`缺少必填字段: ${field}`);
      }
    }
    
    // 验证trade字段（如果提供）
    const validTrades = ['engine', 'paint', 'electric'];
    if (orderData.trade && !validTrades.includes(orderData.trade)) {
      throw createError.validation('技师工种必须是: engine, paint, electric 之一');
    }
    
    // 检查车辆是否存在并属于该用户
    const vehicle = await Vehicle.findOne({
      where: { vehicle_id: orderData.vehicleId },
      attributes: ['vehicle_id', 'user_id', 'model', 'plate_no']
    });
    
    if (!vehicle) {
      throw createError.notFound('未找到该车辆');
    }
    
    if (vehicle.user_id !== user.id) {
      throw createError.authorization('无权为该车辆创建工单');
    }
    
    // 检查是否有未完成的工单
    const hasActiveOrder = await WorkOrder.count({
      where: {
        vehicle_id: orderData.vehicleId,
        status: {
          [Op.in]: ['pending', 'assigned', 'in_progress']
        }
      }
    });
    
    if (hasActiveOrder > 0) {
      throw createError.conflict('该车辆已有未完成的工单');
    }
    
    // 创建新工单
    const newWorkOrder = await WorkOrder.create({
      vehicle_id: orderData.vehicleId,
      customer_id: user.id,
      description: orderData.description,
      trade: orderData.trade || 'engine', // 默认为发动机维修
      status: 'pending'
    });
    
    logger.info(`用户 ${user.id} 为车辆 ${vehicle.vehicle_id} 创建了新工单 ${newWorkOrder.order_id}，指定技师工种: ${newWorkOrder.trade}`);
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '工单创建成功',
      data: {
        workOrder: {
          id: newWorkOrder.order_id,
          vehicleId: newWorkOrder.vehicle_id,
          vehicleInfo: {
            model: vehicle.model,
            licensePlate: vehicle.plate_no
          },
          description: newWorkOrder.description,
          trade: newWorkOrder.trade,
          status: newWorkOrder.status,
          createdAt: newWorkOrder.created_at
        }
      }
    };
  } catch (error) {
    logger.error(`创建工单失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('创建工单失败');
  }
};

/**
 * @swagger
 * /api/customers/work-orders/{id}:
 *   get:
 *     summary: 获取工单详情
 *     description: 获取指定工单的详细信息
 *     tags: [Customers]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     workOrder:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         vehicleId:
 *                           type: string
 *                         vehicleInfo:
 *                           type: object
 *                         description:
 *                           type: string
 *                         status:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         estimatedCompletionTime:
 *                           type: string
 *                           format: date-time
 *                         mechanicInfo:
 *                           type: object
 *                         materials:
 *                           type: array
 *                         totalCost:
 *                           type: number
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权查看该工单
 *       404:
 *         description: 未找到工单
 *       500:
 *         description: 服务器错误
 */
const getWorkOrderById = async (ctx) => {
  try {
    const { user } = ctx.state;
    const orderId = ctx.params.id;
    
    // 从数据库获取工单详细信息
    const workOrder = await WorkOrder.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['vehicle_id', 'user_id', 'model', 'plate_no', 'vin'],
          required: true
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
              ],
              attributes: ['trade']
            }
          ],
          attributes: ['status'],
          required: false
        },
        {
          model: WorkOrderMaterial,
          as: 'materials',
          include: [
            {
              model: Part,
              as: 'part',
              attributes: ['name', 'unit']
            }
          ],
          attributes: ['qty', 'price'],
          required: false
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['total_fee', 'labor_fee'],
          required: false
        },
        {
          model: Feedback,
          as: 'feedbacks',
          attributes: ['rating', 'comment', 'created_at'],
          required: false
        }
      ]
    });
    
    // 检查工单是否存在
    if (!workOrder) {
      throw createError.notFound('未找到该工单');
    }
    
    // 检查工单是否属于当前用户
    if (workOrder.vehicle.user_id !== user.id) {
      throw createError.authorization('无权查看该工单');
    }
    
    // 计算费用
    const materialCost = workOrder.materials ? workOrder.materials.reduce((sum, material) => {
      return sum + (parseFloat(material.price) * material.qty);
    }, 0) : 0;
    
    // 从Payment表获取人工费，而不是计算
    const laborCost = workOrder.payment ? parseFloat(workOrder.payment.labor_fee || 0) : 0;
    
    // 格式化材料信息
    const materials = workOrder.materials ? workOrder.materials.map(material => ({
      name: material.part.name,
      quantity: material.qty,
      unit: material.part.unit,
      unitPrice: parseFloat(material.price),
      total: parseFloat(material.price) * material.qty
    })) : [];
    
    // 格式化技师信息（移除工时相关计算）
    const mechanicInfo = workOrder.mechanics && workOrder.mechanics.length > 0 ? {
      name: workOrder.mechanics[0].mechanic.user.name,
      trade: workOrder.mechanics[0].mechanic.trade
    } : null;
    
    const workOrderDetails = {
      id: workOrder.order_id,
      vehicleId: workOrder.vehicle.vehicle_id,
      vehicleInfo: {
        model: workOrder.vehicle.model,
        licensePlate: workOrder.vehicle.plate_no,
        vin: workOrder.vehicle.vin
      },
      description: workOrder.description,
      trade: workOrder.trade,
      status: workOrder.status,
      createdAt: workOrder.created_at,
      finishedAt: workOrder.finished_at,
      mechanicInfo,
      materials,
      materialCost: parseFloat(materialCost.toFixed(2)),
      laborCost: parseFloat(laborCost.toFixed(2)),
      totalCost: parseFloat((materialCost + laborCost).toFixed(2)),
      paymentInfo: workOrder.payment ? {
        total_fee: parseFloat(workOrder.payment.total_fee),
      } : null,
      feedback: workOrder.feedbacks && workOrder.feedbacks.length > 0 ? {
        rating: workOrder.feedbacks[0].rating,
        comment: workOrder.feedbacks[0].comment,
        createdAt: workOrder.feedbacks[0].created_at
      } : null
    };
    
    logger.info(`用户 ${user.id} 查看了工单 ${orderId} 的详情`);
    
    ctx.body = {
      status: 'success',
      data: {
        workOrder: workOrderDetails
      }
    };
  } catch (error) {
    logger.error(`获取工单详情失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('获取工单详情失败');
  }
};

/**
 * @swagger
 * /api/customers/work-orders/{id}/feedback:
 *   post:
 *     summary: 为工单添加评价
 *     description: 为已完成的工单添加评价和评分
 *     tags: [Customers]
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
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: 评分(1-5)
 *               comment:
 *                 type: string
 *                 description: 评价内容
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
 *                   example: 评价添加成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedback:
 *                       type: object
 *                       properties:
 *                         rating:
 *                           type: integer
 *                         comment:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权为该工单添加评价
 *       404:
 *         description: 未找到工单
 *       409:
 *         description: 该工单已有评价
 *       500:
 *         description: 服务器错误
 */
const addWorkOrderFeedback = async (ctx) => {
  try {
    const { user } = ctx.state;
    const orderId = ctx.params.id;
    const { rating, comment } = ctx.request.body;
    
    // 验证评价数据
    if (!rating || rating < 1 || rating > 5) {
      throw createError.validation('评分必须在1-5之间');
    }
    
    // 获取工单信息
    const workOrder = await WorkOrder.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['user_id'],
          required: true
        },
        {
          model: Feedback,
          as: 'feedbacks',
          attributes: ['feedback_id'],
          required: false
        }
      ],
      attributes: ['order_id', 'status']
    });
    
    // 检查工单是否存在
    if (!workOrder) {
      throw createError.notFound('未找到该工单');
    }
    
    // 检查工单是否属于当前用户
    if (workOrder.vehicle.user_id !== user.id) {
      throw createError.authorization('无权为该工单添加评价');
    }
    
    // 检查工单是否已完成
    if (workOrder.status !== 'done') {
      throw createError.validation('只能为已完成的工单添加评价');
    }
    
    // 检查是否已评价
    if (workOrder.feedbacks && workOrder.feedbacks.length > 0) {
      throw createError.conflict('该工单已有评价');
    }
    
    // 添加评价
    const feedback = await Feedback.create({
      order_id: orderId,
      user_id: user.id,
      rating,
      comment: comment || '',
      type: 'rating'
    });
    
    logger.info(`用户 ${user.id} 为工单 ${orderId} 添加了评价，评分: ${rating}`);
    
    ctx.body = {
      status: 'success',
      message: '评价添加成功',
      data: {
        feedback: {
          rating: feedback.rating,
          comment: feedback.comment,
          createdAt: feedback.created_at
        }
      }
    };
  } catch (error) {
    logger.error(`添加工单评价失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('添加工单评价失败');
  }
};

module.exports = {
  getMyWorkOrders,
  createWorkOrder,
  getWorkOrderById,
  addWorkOrderFeedback
};