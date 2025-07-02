const { User, MechanicProfile, WorkOrderMechanic, WorkOrder, Feedback } = require('../../models');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const logger = createLogger('MechanicProfile');

/**
 * @swagger
 * /api/mechanic/profile:
 *   get:
 *     summary: 获取当前技师个人资料
 *     description: 获取当前登录技师的个人资料信息
 *     tags: [Mechanic]
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
 *                     profile:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         trade:
 *                           type: string
 *                           enum: [engine, paint, electric]
 *                         hourlyRate:
 *                           type: number
 *                         hireDate:
 *                           type: string
 *                           format: date
 *                           description: 入职日期
 *                         certNo:
 *                           type: string
 *                           description: 资质证书编号
 *                         rating:
 *                           type: number
 *                           format: float
 *                           minimum: 0
 *                           maximum: 5
 *                         completedOrders:
 *                           type: integer
 *                         totalLaborFee:
 *                           type: number
 *                           description: 总人工费收入
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getMyProfile = async (ctx) => {
  try {
    const { user } = ctx.state;
    
    // 获取技师详细信息和档案
    const mechanicUser = await User.findOne({
      where: { user_id: user.id },
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          required: true
        }
      ],
      attributes: ['user_id', 'name', 'role', 'created_at']
    });
    
    if (!mechanicUser || !mechanicUser.mechanicProfile) {
      throw createError.notFound('未找到技师档案信息');
    }
    
    // 获取已完成工单数量
    const completedOrders = await WorkOrderMechanic.count({
      where: { mechanic_id: mechanicUser.mechanicProfile.mechanic_id },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder',
          where: { status: 'done' },
          attributes: []
        }
      ]
    });
    
    // 获取总人工费（替代原来的工作时间统计）
    const totalLaborFee = await User.sequelize.query(`
      SELECT COALESCE(SUM(p.labor_fee), 0) as totalFee
      FROM payments p
      INNER JOIN work_orders wo ON p.order_id = wo.order_id
      INNER JOIN work_order_mechanics wom ON wo.order_id = wom.order_id
      WHERE wom.mechanic_id = :mechanicId 
      AND wo.status = 'done'
    `, {
      replacements: { mechanicId: mechanicUser.mechanicProfile.mechanic_id },
      type: User.sequelize.QueryTypes.SELECT
    });
    
    const totalFee = totalLaborFee && totalLaborFee.length > 0 ? 
      parseFloat(totalLaborFee[0].totalFee || 0) : 0;
    
    // 获取平均评分 - 使用原生SQL避免GROUP BY问题
    let averageRating = 0;
    try {
      const ratingResult = await User.sequelize.query(`
        SELECT AVG(f.rating) as averageRating
        FROM feedbacks f
        INNER JOIN work_orders wo ON f.order_id = wo.order_id
        INNER JOIN work_order_mechanics wom ON wo.order_id = wom.order_id
        WHERE wom.mechanic_id = :mechanicId 
        AND f.rating IS NOT NULL 
        AND f.rating > 0
        AND wo.status = 'done'
      `, {
        replacements: { mechanicId: mechanicUser.mechanicProfile.mechanic_id },
        type: User.sequelize.QueryTypes.SELECT
      });
      
      if (ratingResult && ratingResult.length > 0 && ratingResult[0].averageRating) {
        averageRating = parseFloat(parseFloat(ratingResult[0].averageRating).toFixed(1));
      }
    } catch (ratingError) {
      logger.warn(`获取技师 ${user.id} 平均评分失败: ${ratingError.message}`);
      // 如果获取评分失败，设置为0，不影响其他数据的获取
      averageRating = 0;
    }
    
    const mechanicProfile = {
      id: mechanicUser.user_id,
      name: mechanicUser.name,
      trade: mechanicUser.mechanicProfile.trade,
      hourlyRate: parseFloat(mechanicUser.mechanicProfile.hourly_rate || 0),
      hireDate: mechanicUser.mechanicProfile.hire_date,
      certNo: mechanicUser.mechanicProfile.cert_no,
      rating: averageRating,
      completedOrders: completedOrders || 0,
      totalLaborFee: totalFee,
      status: 'active' // 目前默认为active
    };
    
    logger.info(`技师 ${user.id} 获取了个人资料信息`);
    
    ctx.body = {
      status: 'success',
      data: {
        profile: mechanicProfile
      }
    };
  } catch (error) {
    logger.error(`获取技师资料失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('获取技师资料失败');
  }
};

/**
 * @swagger
 * /api/mechanic/profile:
 *   put:
 *     summary: 更新当前技师个人资料
 *     description: 更新当前登录技师的个人资料信息
 *     tags: [Mechanic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trade:
 *                 type: string
 *                 enum: [engine, paint, electric]
 *                 description: 专业工种
 *               hourlyRate:
 *                 type: number
 *                 description: 时薪
 *               hireDate:
 *                 type: string
 *                 format: date
 *                 description: 入职日期
 *               certNo:
 *                 type: string
 *                 description: 资质证书编号
 *               name:
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
    const profileFields = ['trade', 'hourly_rate', 'hire_date', 'cert_no'];
    const userFields = ['name'];
    const profileUpdates = {};
    const userUpdates = {};
    
    Object.keys(updateData).forEach(key => {
      if (key === 'hourlyRate') {
        profileUpdates.hourly_rate = updateData[key];
      } else if (key === 'hireDate') {
        profileUpdates.hire_date = updateData[key];
      } else if (key === 'certNo') {
        profileUpdates.cert_no = updateData[key];
      } else if (profileFields.includes(key)) {
        profileUpdates[key] = updateData[key];
      } else if (userFields.includes(key)) {
        userUpdates[key] = updateData[key];
      }
      // 密码字段单独处理，不加入userUpdates
    });
    
    // 检查是否有有效的更新字段（包括密码）
    const hasValidUpdates = Object.keys(profileUpdates).length > 0 || 
                           Object.keys(userUpdates).length > 0 || 
                           updateData.password;
    
    if (!hasValidUpdates) {
      throw createError.validation('没有提供有效的更新字段');
    }
    
    // 验证数值字段
    if (profileUpdates.hourly_rate !== undefined) {
      if (isNaN(profileUpdates.hourly_rate) || profileUpdates.hourly_rate <= 0) {
        throw createError.validation('时薪必须是大于0的数字');
      }
    }
    
    // 验证专业工种
    if (profileUpdates.trade) {
      const validTrades = ['engine', 'paint', 'electric'];
      if (!validTrades.includes(profileUpdates.trade)) {
        throw createError.validation('专业工种必须是 engine、paint 或 electric');
      }
    }
    
    // 验证日期格式
    if (profileUpdates.hire_date) {
      const dateObj = new Date(profileUpdates.hire_date);
      if (isNaN(dateObj.getTime())) {
        throw createError.validation('入职日期格式无效');
      }
    }
    
    // 获取当前用户信息
    const currentUser = await User.findOne({
      where: { user_id: user.id },
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          required: true
        }
      ],
      attributes: ['user_id', 'name', 'password_hash']
    });
    
    if (!currentUser || !currentUser.mechanicProfile) {
      throw createError.notFound('未找到技师档案');
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
      userUpdates.password_hash = await bcrypt.hash(updateData.password, salt);
      
      logger.info(`技师 ${user.id} 更新了密码`);
    }
    
    const updatedFields = [];
    
    // 更新用户基本信息
    if (Object.keys(userUpdates).length > 0) {
      await User.update(userUpdates, {
        where: { user_id: user.id }
      });
      
      updatedFields.push(...Object.keys(userUpdates).map(key => 
        key === 'password_hash' ? 'password' : key
      ));
    }
    
    // 更新技师档案信息
    if (Object.keys(profileUpdates).length > 0) {
      await MechanicProfile.update(profileUpdates, {
        where: { mechanic_id: user.id }
      });
      
      // 映射字段名
      const fieldMapping = {
        hourly_rate: 'hourlyRate',
        hire_date: 'hireDate',
        cert_no: 'certNo'
      };
      
      Object.keys(profileUpdates).forEach(key => {
        updatedFields.push(fieldMapping[key] || key);
      });
    }
    
    logger.info(`技师 ${user.id} 更新了个人资料: ${updatedFields.join(', ')}`);
    
    ctx.body = {
      status: 'success',
      message: '个人资料已更新',
      data: {
        updatedFields
      }
    };
  } catch (error) {
    logger.error(`更新技师资料失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('更新技师资料失败');
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile
};
