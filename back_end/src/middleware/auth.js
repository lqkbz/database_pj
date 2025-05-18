//验证用户是否登录
const { verifyToken, getTokenFromHeader } = require('../utils/jwt');

/**
 * 认证中间件 - 验证用户是否登录
 * @param {Object} ctx - Koa上下文
 * @param {Function} next - 下一个中间件
 */
module.exports = async (ctx, next) => {
  try {
    // 从请求头获取令牌
    const token = getTokenFromHeader(ctx);
    
    if (!token) {
      ctx.status = 401;
      ctx.body = { 
        status: 'error', 
        message: '未提供认证令牌' 
      };
      return;
    }
    
    // 验证令牌
    const decoded = verifyToken(token);
    
    // 确保是访问令牌而不是刷新令牌
    if (decoded.type !== 'access') {
      ctx.status = 403;
      ctx.body = { 
        status: 'error', 
        message: '无效的令牌类型' 
      };
      return;
    }
    
    // 将解码后的用户信息存储在ctx.state中，以便后续中间件和路由处理程序访问
    ctx.state.user = decoded;
    
    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { 
      status: 'error', 
      message: error.message || '认证失败' 
    };
  }
};
