const { verifyToken, generateToken } = require('../../utils/jwt');
const { createError } = require('../../middleware/errorhandler');

/**
 * 刷新令牌控制器
 * 
 * 使用刷新令牌生成新的访问令牌
 * 
 * @param {Object} ctx - Koa上下文
 */
module.exports = async (ctx) => {
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
    throw createError.notFound('用户不存在');
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
};
