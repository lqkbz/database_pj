const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 生成JWT令牌
 * @param {Object} payload - 要编码到令牌中的数据
 * @param {String} type - 令牌类型 ('access' 或 'refresh')
 * @returns {String} JWT令牌
 */
exports.generateToken = (payload, type = 'access') => {
  const expiresIn = type === 'refresh' 
    ? config.jwt.refreshExpiresIn 
    : config.jwt.expiresIn;
  
  return jwt.sign(
    { ...payload, type },
    config.jwt.secret,
    { expiresIn }
  );
};

/**
 * 验证JWT令牌
 * @param {String} token - 要验证的JWT令牌
 * @returns {Object} 解码后的payload
 * @throws {Error} 如果令牌无效或已过期
 */
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('无效的令牌或令牌已过期');
  }
};

/**
 * 从请求头中获取令牌
 * @param {Object} ctx - Koa上下文对象
 * @returns {String|null} 令牌或null
 */
exports.getTokenFromHeader = (ctx) => {
  const authorization = ctx.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.substring(7); // 移除 'Bearer ' 前缀
}; 