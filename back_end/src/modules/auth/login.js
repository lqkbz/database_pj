/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 用户使用用户名和密码登录系统，返回JWT令牌
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 用户密码
 *     responses:
 *       200:
 *         description: 登录成功
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
 *                     token:
 *                       type: string
 *                       description: JWT认证令牌
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: 用户ID
 *                         username:
 *                           type: string
 *                           description: 用户名
 *                         role:
 *                           type: string
 *                           enum: [customer, mechanic, admin]
 *                           description: 用户角色
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 用户名或密码错误
 *       500:
 *         description: 服务器错误
 */

const { validateLogin } = require('../../utils/validator');
const { generateToken } = require('../../utils/jwt');
const { User, MechanicProfile } = require('../../models');
const bcrypt = require('bcrypt');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('Auth');

/**
 * 用户登录控制器
 * 
 * 处理用户登录请求，验证用户凭据，生成JWT令牌
 * 
 * @param {Object} ctx - Koa上下文
 */
const login = async (ctx) => {
  try {
    const { username, password } = ctx.request.body;
    
    // 验证用户输入
    const { isValid, errors } = validateLogin({ username, password });
    
    if (!isValid) {
      ctx.status = 400;
      ctx.body = {
        status: 'error',
        message: '输入数据验证失败',
        errors
      };
      return;
    }
    
    // 从数据库查找用户
    const user = await User.findOne({
      where: { name: username },
      attributes: ['user_id', 'name', 'password_hash', 'role', 'created_at'],
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
      logger.warn(`登录失败: 用户名不存在 - ${username}`);
      ctx.status = 401;
      ctx.body = {
        status: 'error',
        message: '用户名或密码错误'
      };
      return;
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      logger.warn(`登录失败: 密码错误 - ${username}`);
      ctx.status = 401;
      ctx.body = {
        status: 'error',
        message: '用户名或密码错误'
      };
      return;
    }
    
    // 生成访问令牌和刷新令牌
    const payload = {
      id: user.user_id,
      username: user.name,
      role: user.role,
      status: 'active',  // 添加默认状态
      fullName: user.name  // 添加全名
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
    const refreshToken = generateToken({ id: user.user_id }, 'refresh');
    
    logger.info(`用户登录成功: ${username} (${user.role})`);
    
    // 返回成功响应和令牌
    ctx.status = 200;
    ctx.body = {
      status: 'success',
      message: '登录成功',
      data: {
        user: {
          id: user.user_id,
          username: user.name,
          name: user.name,
          role: user.role,
          mechanicProfile: user.mechanicProfile || null
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    };
  } catch (error) {
    logger.error(`登录过程中发生错误: ${error.message}`);
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '登录过程中发生错误',
      error: error.message
    };
  }
};

module.exports = {
  login
};
