const { verifyToken, generateToken } = require('../../utils/jwt');

/**
 * 刷新令牌控制器
 * 
 * 使用刷新令牌生成新的访问令牌
 * 
 * @param {Object} ctx - Koa上下文
 */
module.exports = async (ctx) => {
  try {
    const { refreshToken } = ctx.request.body;
    
    if (!refreshToken) {
      ctx.status = 400;
      ctx.body = {
        status: 'error',
        message: '刷新令牌不能为空'
      };
      return;
    }
    
    // 验证刷新令牌
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      ctx.status = 401;
      ctx.body = {
        status: 'error',
        message: '无效的刷新令牌'
      };
      return;
    }
    
    // 确保是刷新令牌
    if (decoded.type !== 'refresh') {
      ctx.status = 401;
      ctx.body = {
        status: 'error',
        message: '提供的不是刷新令牌'
      };
      return;
    }
    
    // 获取用户信息
    // 注意：这里需要连接到实际的数据库
    // 以下是模拟代码，实际项目中应替换为数据库操作
    const user = { 
      id: decoded.id,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user'
    };
    
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        status: 'error',
        message: '用户不存在'
      };
      return;
    }
    
    // 生成新的访问令牌
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(payload, 'access');
    
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
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '令牌刷新过程中发生错误',
      error: error.message
    };
  }
};
