/**
 * 认证中间件 - Authentication Middleware
 * 
 * 功能说明：
 * - 验证用户的JWT令牌
 * - 解析用户信息并添加到ctx.state
 * - 处理认证相关的错误
 * 
 * 针对车辆维修管理系统，支持三种角色：
 * - customer: 客户 - 提交报修、查询信息、反馈评价
 * - mechanic: 维修人员 - 接收工单、记录材料、更新进度
 * - admin: 系统管理员 - 维护所有信息、监控系统
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
    return new AuthenticationError('认证令牌已过期，请重新登录');
  },
  
  tokenInvalid: () => {
    return new AuthenticationError('无效的认证令牌');
  },
  
  invalidCredentials: () => {
    return new AuthenticationError('用户名或密码错误');
  },
  
  accountDisabled: () => {
    return new AuthenticationError('账户已被禁用，请联系管理员');
  },

  accountSuspended: () => {
    return new AuthenticationError('账户已被暂停，请联系管理员');
  },

  invalidRole: () => {
    return new AuthenticationError('用户角色无效');
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
      
      // 验证用户角色是否有效
      const validRoles = ['customer', 'mechanic', 'admin'];
      if (!validRoles.includes(decoded.role)) {
        throw createAuthError.invalidRole();
      }

      // 验证用户状态
      if (decoded.status === 'inactive') {
        throw createAuthError.accountDisabled();
      }
      
      if (decoded.status === 'suspended') {
        throw createAuthError.accountSuspended();
      }
      
      // 将用户信息添加到ctx.state
      ctx.state.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        status: decoded.status,
        fullName: decoded.fullName,
        phone: decoded.phone,
        email: decoded.email
      };
      
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
      message: error.message || '认证失败',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 可选认证中间件
 * 如果有令牌则验证，没有则继续
 * 适用于一些公共接口，有令牌时可以获得更多信息
 */
const optionalAuth = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // 验证角色和状态
        const validRoles = ['customer', 'mechanic', 'admin'];
        if (validRoles.includes(decoded.role) && decoded.status === 'active') {
          ctx.state.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            status: decoded.status,
            fullName: decoded.fullName,
            phone: decoded.phone,
            email: decoded.email
          };
        } else {
          ctx.state.user = null;
        }
      } catch (error) {
        // 令牌无效但不阻止请求
        ctx.state.user = null;
      }
    } else {
      ctx.state.user = null;
    }
    await next();
  } catch (error) {
    ctx.state.user = null;
    await next();
  }
};

/**
 * 根据用户角色生成JWT令牌
 * @param {Object} user - 用户信息
 * @returns {String} JWT令牌
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email
  };
  
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'vehicle-repair-system'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', options);
};

/**
 * 验证刷新令牌
 * @param {String} refreshToken - 刷新令牌
 * @returns {Object} 解码后的令牌信息
 */
const verifyRefreshToken = (refreshToken) => {
  try {
    return jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createAuthError.tokenExpired();
    } else if (error.name === 'JsonWebTokenError') {
      throw createAuthError.tokenInvalid();
    }
    throw error;
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  createAuthError,
  AuthenticationError,
  generateToken,
  verifyRefreshToken
};
