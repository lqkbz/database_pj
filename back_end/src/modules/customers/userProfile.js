const { User, Vehicle, WorkOrder } = require('../../models');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const logger = createLogger('CustomerProfile');

/**
 * @swagger
 * /api/customers/profile:
 *   get:
 *     summary: 获取当前客户个人资料
 *     description: 获取当前登录客户的个人资料信息
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         fullName:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         vehicleCount:
 *                           type: integer
 *                         orderCount:
 *                           type: integer
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getMyProfile = async (ctx) => {
  try {
    const { user } = ctx.state;
    
    // 获取用户详细信息
    const userDetails = await User.findOne({
      where: { user_id: user.id },
      attributes: ['user_id', 'name', 'role', 'created_at']
    });
    
    if (!userDetails) {
      throw createError.notFound('用户不存在');
    }
    
    // 获取用户车辆数量
    const vehicleCount = await Vehicle.count({
      where: { user_id: user.id }
    });
    
    // 获取用户工单数量
    const orderCount = await WorkOrder.count({
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          where: { user_id: user.id },
          attributes: []
        }
      ]
    });
    
    const profileData = {
      id: userDetails.user_id,
      username: userDetails.name,
      role: userDetails.role,
      createdAt: userDetails.created_at,
      vehicleCount,
      orderCount
    };
    
    logger.info(`用户 ${user.id} 获取了个人资料信息`);
    
    ctx.body = {
      status: 'success',
      data: {
        user: profileData
      }
    };
  } catch (error) {
    logger.error(`获取用户资料失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('获取用户资料失败');
  }
};

/**
 * @swagger
 * /api/customers/profile:
 *   put:
 *     summary: 更新当前客户个人资料
 *     description: 更新当前登录客户的个人资料信息
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: 姓名
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 新密码
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: 当前密码（更新密码时必填）
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
 *                   example: 个人资料已更新
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedFields:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const updateMyProfile = async (ctx) => {
  try {
    const { user } = ctx.state;
    const updateData = ctx.request.body;
    
    // 验证更新数据
    const allowedFields = ['fullName', 'password'];
    const updates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        if (key === 'fullName') {
          updates.name = updateData[key];
        } else if (key === 'password') {
          // 密码单独处理，不直接加入updates
          // 稍后会处理密码加密
        }
      }
    });
    
    // 检查是否有有效的更新字段
    const hasValidUpdates = Object.keys(updates).length > 0 || updateData.password;
    
    if (!hasValidUpdates) {
      throw createError.validation('没有提供有效的更新字段');
    }
    
    // 获取当前用户信息
    const currentUser = await User.findOne({
      where: { user_id: user.id },
      attributes: ['user_id', 'name', 'password_hash']
    });
    
    if (!currentUser) {
      throw createError.notFound('用户不存在');
    }
    
    // 处理密码更新
    if (updateData.password) {
      if (!updateData.currentPassword) {
        throw createError.validation('更新密码时必须提供当前密码');
      }
      
      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(updateData.currentPassword, currentUser.password_hash);
      if (!isCurrentPasswordValid) {
        throw createError.authentication('当前密码错误');
      }
      
      // 加密新密码
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(updateData.password, salt);
      
      logger.info(`用户 ${user.id} 更新了密码`);
    }
    
    // 更新用户信息
    await User.update(updates, {
      where: { user_id: user.id }
    });
    
    const updatedFields = Object.keys(updates).map(key => {
      if (key === 'name') return 'fullName';
      if (key === 'password_hash') return 'password';
      return key;
    });
    
    logger.info(`用户 ${user.id} 更新了个人资料: ${updatedFields.join(', ')}`);
    
    ctx.body = {
      status: 'success',
      message: '个人资料已更新',
      data: {
        updatedFields
      }
    };
  } catch (error) {
    logger.error(`更新用户资料失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('更新用户资料失败');
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile
};