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
 *                 description: 用户名或电子邮箱
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
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
    const { username, email, password } = ctx.request.body;
    
    // 验证用户输入
    const { isValid, errors } = validateLogin({ username, email, password });
    
    if (!isValid) {
      ctx.status = 400;
      ctx.body = {
        status: 'error',
        message: '输入数据验证失败',
        errors
      };
      return;
    }
    
    // 查找用户
    // 注意：这里需要连接到实际的数据库
    // 以下是模拟代码，实际项目中应替换为数据库操作
    const user = { 
      id: 'user_1',
      username: 'testuser',
      email: 'test@example.com',
      password: '$2b$10$XAI.GDJpDOQz4kkVB6HuaeQH0CKaVIKpL7znOQIbVINvVrAr0n5Iq', // 加密的 'password123'
      role: 'user'
    };
    
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        status: 'error',
        message: '用户名或密码错误'
      };
      return;
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      ctx.status = 401;
      ctx.body = {
        status: 'error',
        message: '用户名或密码错误'
      };
      return;
    }
    
    // 生成访问令牌和刷新令牌
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(payload, 'access');
    const refreshToken = generateToken({ id: user.id }, 'refresh');
    
    // 返回成功响应和令牌
    ctx.status = 200;
    ctx.body = {
      status: 'success',
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    };
  } catch (error) {
    logger.error(`用户 ${username} 登录失败: ${error.message}`);
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '登录过程中发生错误',
      error: error.message
    };
  }
};

/**
 * 模拟用户认证
 * 在真实环境中，应该从数据库中查询用户并验证密码
 * 
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Object|null} 用户对象或null
 */
function mockAuthenticateUser(username, password) {
  // 模拟用户数据
  const users = [
    {
      id: 'user1',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    },
    {
      id: 'user2',
      username: 'mechanic',
      password: 'mechanic123',
      role: 'mechanic',
      status: 'active'
    },
    {
      id: 'user3',
      username: 'customer',
      password: 'customer123',
      role: 'customer',
      status: 'active'
    },
    {
      id: 'user4',
      username: 'inactive',
      password: 'inactive123',
      role: 'customer',
      status: 'inactive'
    }
  ];
  
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
}

module.exports = {
  login
};
