const { validateLogin } = require('../../utils/validator');
const { generateToken } = require('../../utils/jwt');
const bcrypt = require('bcrypt');

/**
 * 用户登录控制器
 * 
 * 处理用户登录请求，验证用户凭据，生成JWT令牌
 * 
 * @param {Object} ctx - Koa上下文
 */
module.exports = async (ctx) => {
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
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '登录过程中发生错误',
      error: error.message
    };
  }
};
