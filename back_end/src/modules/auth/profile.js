/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: 获取用户个人资料
 *     description: 获取当前已认证用户的个人资料信息
 *     tags: [auth]
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
 *                           description: 用户ID
 *                         name:
 *                           type: string
 *                           description: 用户姓名
 *                         role:
 *                           type: string
 *                           description: 用户角色
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: 创建时间
 *                         mechanicProfile:
 *                           type: object
 *                           description: 技师档案信息（仅技师角色）
 *                           properties:
 *                             mechanic_id:
 *                               type: integer
 *                               description: 技师ID
 *                             trade:
 *                               type: string
 *                               enum: [engine, paint, electric]
 *                               description: 专业工种
 *                             hourly_rate:
 *                               type: number
 *                               format: decimal
 *                               description: 时薪
 *                             hire_date:
 *                               type: string
 *                               format: date
 *                               description: 入职日期
 *                             cert_no:
 *                               type: string
 *                               description: 资质证书编号
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const { User, MechanicProfile } = require('../../models');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('Auth');

/**
 * 获取用户个人资料控制器
 * 
 * 获取当前已认证用户的个人资料信息
 * 
 * @param {Object} ctx - Koa上下文
 */
const profile = async (ctx) => {
  try {
    // 从ctx.state获取用户信息（由认证中间件设置）
    const { user } = ctx.state;
    
    if (!user) {
      const authError = new Error('未认证的用户');
      authError.statusCode = 401;
      authError.code = 'AUTHENTICATION_ERROR';
      authError.isOperational = true;
      throw authError;
    }
    
    // 验证用户角色（额外安全检查）
    const validRoles = ['customer', 'mechanic', 'admin'];
    if (!validRoles.includes(user.role)) {
      const roleError = new Error('用户角色无效');
      roleError.statusCode = 403;
      roleError.code = 'AUTHORIZATION_ERROR';
      roleError.isOperational = true;
      throw roleError;
    }
    
    // 从数据库获取完整的用户信息
    logger.info(`正在查询用户ID: ${user.id}, 角色: ${user.role}`);
    
    const userProfile = await User.findOne({
      where: { user_id: user.id },
      attributes: ['user_id', 'name', 'role', 'created_at'],
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          attributes: ['mechanic_id', 'trade', 'hourly_rate', 'hire_date', 'cert_no'],
          required: false
        }
      ]
    });
    
    if (!userProfile) {
      throw createError.notFound('用户不存在');
    }
    
    // 调试信息
    logger.info(`用户查询结果: ${userProfile.name} (${userProfile.role})`);
    logger.info(`MechanicProfile 数据:`, JSON.stringify(userProfile.mechanicProfile, null, 2));
    
    // 如果是技师角色但没有档案，单独查询检验
    if (userProfile.role === 'mechanic' && !userProfile.mechanicProfile) {
      logger.warn(`技师用户 ${userProfile.name} 没有关联的技师档案`);
      
      // 直接查询MechanicProfile表
      const directProfile = await MechanicProfile.findOne({
        where: { mechanic_id: user.id }
      });
      
      logger.info(`直接查询技师档案结果:`, JSON.stringify(directProfile, null, 2));
    }
    
    // 返回用户资料信息，不包含敏感数据
    ctx.status = 200;
    ctx.body = {
      status: 'success',
      data: {
        user: {
          id: userProfile.user_id,
          name: userProfile.name,
          role: userProfile.role,
          createdAt: userProfile.created_at,
          mechanicProfile: userProfile.mechanicProfile || null
        }
      }
    };
  } catch (error) {
    logger.error(`获取用户资料失败: ${error.message}`);
    
    // 如果是自定义错误，直接抛出
    if (error.isOperational) {
      throw error;
    }
    
    // 其他错误
    throw createError.internal('获取用户资料过程中发生错误');
  }
};

module.exports = {
  profile
};
