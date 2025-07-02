/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     description: 使用刷新令牌生成新的访问令牌
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌
 *     responses:
 *       200:
 *         description: 令牌刷新成功
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
 *                   example: 令牌刷新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 新的访问令牌
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 无效的刷新令牌
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
const { verifyToken, generateToken } = require('../../utils/jwt');
const { User, MechanicProfile } = require('../../models');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('Auth');

/**
 * 刷新令牌控制器
 * 
 * 使用刷新令牌生成新的访问令牌
 * 
 * @param {Object} ctx - Koa上下文
 */
const refresh = async (ctx) => {
  try {
  const { refreshToken } = ctx.request.body;
  
  if (!refreshToken) {
    throw createError.validation('刷新令牌不能为空');
  }
  
  // 验证刷新令牌
  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch (error) {
    throw createError.authentication('无效的刷新令牌');
  }
  
  // 确保是刷新令牌
  if (decoded.type !== 'refresh') {
    throw createError.authentication('提供的不是刷新令牌');
  }
  
    // 从数据库获取用户信息
    const user = await User.findOne({
      where: { user_id: decoded.id },
      attributes: ['user_id', 'name', 'role'],
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          attributes: ['mechanic_id', 'trade', 'hourly_rate'],
          required: false
        }
      ]
    });
  
  if (!user) {
    throw createError.notFound('用户不存在');
  }
  
  // 生成新的访问令牌
  const payload = {
      id: user.user_id,
      username: user.name,
      name: user.name,
    role: user.role
  };
    
    // 如果是技师，添加技师档案信息
    if (user.role === 'mechanic' && user.mechanicProfile) {
      payload.mechanicProfile = {
        mechanic_id: user.mechanicProfile.mechanic_id,
        trade: user.mechanicProfile.trade,
        hourly_rate: user.mechanicProfile.hourly_rate
      };
    }
  
  const accessToken = generateToken(payload, 'access');
    
    logger.info(`用户刷新令牌成功: ${user.name} (${user.role})`);
  
  // 返回成功响应和新令牌
  ctx.status = 200;
  ctx.body = {
    status: 'success',
    message: '令牌刷新成功',
    data: {
      accessToken
    }
  };
  } catch (error) {
    logger.error(`令牌刷新失败: ${error.message}`);
    
    // 如果是自定义错误，直接抛出
    if (error.isCustomError) {
      throw error;
    }
    
    // 其他错误
    throw createError.internal('令牌刷新过程中发生错误');
  }
};

module.exports = {
  refresh
};
