/**
 * 认证中间件 - Authentication Middleware
 * 
 * 功能说明：
 * - 验证用户的JWT令牌
 * - 解析用户信息并添加到ctx.state
 * - 处理认证相关的错误
 */

const jwt = require('jsonwebtoken');
const { ErrorTypes } = require('./errorhandler');

/**
 * 认证相关错误类
 */
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = ErrorTypes.AUTHENTICATION_ERROR.status;
    this.code = ErrorTypes.AUTHENTICATION_ERROR.code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 创建认证错误的辅助函数
 */
const createAuthError = {
  tokenMissing: () => {
    return new AuthenticationError('缺少认证令牌');
  },
  
  tokenExpired: () => {
    return new AuthenticationError('认证令牌已过期');
  },
  
  tokenInvalid: () => {
    return new AuthenticationError('无效的认证令牌');
  },
  
  invalidCredentials: () => {
    return new AuthenticationError('用户名或密码错误');
  },
  
  accountDisabled: () => {
    return new AuthenticationError('账户已被禁用');
  }
};

/**
 * JWT认证中间件
 * 验证请求头中的Authorization令牌
 */
const authMiddleware = async (ctx, next) => {
  try {
    // 从请求头中获取令牌
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createAuthError.tokenMissing();
    }
    
    const token = authHeader.substring(7);
    
    // 验证令牌
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // 将用户信息添加到ctx.state
      ctx.state.user = decoded;
      
      // 继续处理请求
      await next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw createAuthError.tokenExpired();
      } else if (error.name === 'JsonWebTokenError') {
        throw createAuthError.tokenInvalid();
      }
      throw error;
    }
  } catch (error) {
    ctx.status = error.statusCode || 401;
    ctx.body = {
      status: 'error',
      code: error.code || 'AUTHENTICATION_ERROR',
      message: error.message || '认证失败'
    };
  }
};

/**
 * 可选认证中间件
 * 如果有令牌则验证，没有则继续
 */
const optionalAuth = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        ctx.state.user = decoded;
      } catch (error) {
        // 令牌无效但不阻止请求
        ctx.state.user = null;
      }
    } else {
      ctx.state.user = null;
    }
    await next();
  } catch (error) {
    await next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  createAuthError,
  AuthenticationError
};
