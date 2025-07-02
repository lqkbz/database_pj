const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { User, Vehicle, WorkOrder } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminUserManagement');

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: 获取用户列表
 *     description: 管理员获取系统中所有用户的列表
 *     tags: [admin]
 *     parameters:
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
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, mechanic, admin]
 *         description: 用户角色过滤
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取用户列表
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权访问
 */
const listUsers = async (ctx) => {
  const { page = 1, limit = 10, search, role } = ctx.query;
  
  // 构建查询条件
  const whereClause = {};
  
  if (search) {
    whereClause.name = {
      [Op.like]: `%${search}%`
    };
  }
  
  if (role) {
    whereClause.role = role;
  }
  
  try {
  // 从数据库获取用户列表
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Vehicle,
          as: 'vehicles',
          attributes: ['vehicle_id']
        },
        {
          model: WorkOrder,
          as: 'customerOrders',
          attributes: ['order_id']
        }
      ],
      attributes: ['user_id', 'name', 'role', 'created_at'],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    // 处理用户数据，添加统计信息
    const processedUsers = users.map(user => ({
      id: user.user_id,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      vehicleCount: user.vehicles ? user.vehicles.length : 0,
      orderCount: user.customerOrders ? user.customerOrders.length : 0
    }));
  
  logger.info(`管理员查询了用户列表，返回 ${users.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
        users: processedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    throw createError.internal('获取用户列表失败');
    }
};

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: 获取用户详情
 *     description: 管理员获取指定用户的详细信息
 *     tags: [admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取用户详情
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
 *                     user:
 *                       $ref: '#/components/schemas/UserDetail'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 用户不存在
 */
const getUserDetail = async (ctx) => {
  const userId = ctx.params.id;
  
  try {
  // 从数据库获取用户详情
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Vehicle,
          as: 'vehicles',
          attributes: ['vehicle_id', 'make', 'model', 'plate_no', 'year']
      },
      {
          model: WorkOrder,
          as: 'customerOrders',
          attributes: ['order_id', 'description', 'status', 'created_at', 'finished_at'],
          order: [['created_at', 'DESC']],
          limit: 10
        }
      ],
      attributes: ['user_id', 'name', 'role', 'created_at']
    });
  
  if (!user) {
    throw createError.notFound('用户不存在');
  }

    const userDetail = {
      id: user.user_id,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      vehicles: user.vehicles.map(vehicle => ({
        id: vehicle.vehicle_id,
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.plate_no,
        year: vehicle.year
      })),
      recentOrders: user.customerOrders.map(order => ({
        id: order.order_id,
        description: order.description,
        status: order.status,
        createdAt: order.created_at,
        completedAt: order.finished_at
      }))
    };
  
  logger.info(`管理员查看了用户 ${userId} 的详细信息`);
  
  ctx.body = {
    status: 'success',
    data: {
        user: userDetail
    }
  };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`获取用户详情失败 (ID: ${userId}):`, error);
    throw createError.internal('获取用户详情失败');
  }
};

/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     summary: 更新用户信息
 *     description: 管理员更新指定用户的信息
 *     tags: [admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 用户姓名
 *               role:
 *                 type: string
 *                 enum: [customer, mechanic, admin]
 *                 description: 用户角色
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功更新用户信息
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: 无效的请求数据
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 用户不存在
 */
const updateUser = async (ctx) => {
  const userId = ctx.params.id;
  const updateData = ctx.request.body;
  
  try {
    // 获取用户信息
    const user = await User.findByPk(userId);
  
  if (!user) {
    throw createError.notFound('用户不存在');
  }
  
  // 验证更新数据
    const allowedFields = ['name', 'role'];
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
  if (updates.role && !['customer', 'mechanic', 'admin'].includes(updates.role)) {
    throw createError.validation('无效的角色值');
  }
  
    // 更新用户信息
    await user.update(updates);
  
    logger.info(`管理员更新了用户 ${userId} 的信息:`, updates);
  
  ctx.body = {
    status: 'success',
    message: '用户信息已更新',
    data: {
      user: {
          id: user.user_id,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
      }
    }
  };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`更新用户信息失败 (ID: ${userId}):`, error);
    throw createError.internal('更新用户信息失败');
  }
};

module.exports = {
  listUsers,
  getUserDetail,
  updateUser
};