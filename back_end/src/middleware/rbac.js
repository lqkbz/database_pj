/**
 * 基于角色的访问控制中间件 - RBAC (Role-Based Access Control) Middleware
 * 
 * 功能说明：
 * - 验证用户是否具有访问权限
 * - 支持角色和权限级别的控制
 * - 处理授权相关的错误
 * 
 * 车辆维修管理系统角色定义：
 * - customer: 客户 - 管理自己的车辆和工单
 * - mechanic: 维修人员 - 处理分配给自己的工单
 * - admin: 系统管理员 - 全局管理权限
 */

const { ErrorTypes } = require('./errorhandler');
const { createLogger } = require('./logger');
const { ROLES, ACCESS, resourceAccessRules } = require('../config/rbac');

const logger = createLogger('RBAC');

/**
 * 授权相关错误类
 */
class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = ErrorTypes.AUTHORIZATION_ERROR.status;
    this.code = ErrorTypes.AUTHORIZATION_ERROR.code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 创建授权错误的辅助函数
 */
const createAuthzError = {
  insufficientRole: (requiredRole) => {
    return new AuthorizationError(`需要 ${requiredRole} 角色权限`);
  },
  
  insufficientPermission: (requiredPermission) => {
    return new AuthorizationError(`需要 ${requiredPermission} 权限`);
  },
  
  resourceOwnership: () => {
    return new AuthorizationError('您没有权限访问此资源');
  },
  
  accountRestricted: (reason) => {
    return new AuthorizationError(`账户受限: ${reason}`);
  },

  roleNotAllowed: (action) => {
    return new AuthorizationError(`您的角色无权进行此操作: ${action}`);
  },

  resourceNotFound: () => {
    return new AuthorizationError('请求的资源不存在或您无权访问');
  }
};

/**
 * 角色检查中间件
 * 验证用户是否具有指定角色
 * 
 * @param {String|Array} roles - 允许的角色或角色数组
 */
const requireRole = (roles) => {
  // 将单个角色转换为数组
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return async (ctx, next) => {
    try {
      // 确保用户已认证
      if (!ctx.state.user) {
        ctx.status = 401;
        ctx.body = {
          status: 'error',
          code: 'AUTHENTICATION_ERROR',
          message: '请先登录',
          timestamp: new Date().toISOString()
        };
        return;
      }
      
      // 检查用户角色
      const userRole = ctx.state.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        throw createAuthzError.insufficientRole(allowedRoles.join(' 或 '));
      }
      
      // 检查账户状态
      if (ctx.state.user.status !== 'active') {
        throw createAuthzError.accountRestricted('账户状态异常');
      }
      
      await next();
    } catch (error) {
      ctx.status = error.statusCode || 403;
      ctx.body = {
        status: 'error',
        code: error.code || 'AUTHORIZATION_ERROR',
        message: error.message || '权限不足',
        timestamp: new Date().toISOString()
      };
    }
  };
};

/**
 * 权限检查中间件
 * 验证用户是否具有指定权限
 * 
 * @param {String|Array} permissions - 允许的权限或权限数组
 */
const requirePermission = (permissions) => {
  // 将单个权限转换为数组
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return async (ctx, next) => {
    try {
      // 确保用户已认证
      if (!ctx.state.user) {
        ctx.status = 401;
        ctx.body = {
          status: 'error',
          code: 'AUTHENTICATION_ERROR',
          message: '请先登录',
          timestamp: new Date().toISOString()
        };
        return;
      }
      
      // 检查用户权限
      const userPermissions = ctx.state.user.permissions || [];
      
      // 检查是否拥有所有必需权限
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        throw createAuthzError.insufficientPermission(requiredPermissions.join(', '));
      }
      
      await next();
    } catch (error) {
      ctx.status = error.statusCode || 403;
      ctx.body = {
        status: 'error',
        code: error.code || 'AUTHORIZATION_ERROR',
        message: error.message || '权限不足',
        timestamp: new Date().toISOString()
      };
    }
  };
};

/**
 * 资源所有权检查中间件
 * 验证用户是否是资源的所有者
 * 
 * @param {Function} getResourceOwnerId - 从请求中获取资源所有者ID的函数
 */
const requireOwnership = (getResourceOwnerId) => {
  return async (ctx, next) => {
    try {
      // 确保用户已认证
      if (!ctx.state.user) {
        ctx.status = 401;
        ctx.body = {
          status: 'error',
          code: 'AUTHENTICATION_ERROR',
          message: '请先登录',
          timestamp: new Date().toISOString()
        };
        return;
      }
      
      // 管理员有全局权限
      if (ctx.state.user.role === ROLES.ADMIN) {
        return await next();
      }
      
      // 获取资源所有者ID
      const ownerId = await getResourceOwnerId(ctx);
      
      // 检查用户是否是所有者
      const isOwner = String(ctx.state.user.id) === String(ownerId);
      
      if (!isOwner) {
        throw createAuthzError.resourceOwnership();
      }
      
      await next();
    } catch (error) {
      ctx.status = error.statusCode || 403;
      ctx.body = {
        status: 'error',
        code: error.code || 'AUTHORIZATION_ERROR',
        message: error.message || '权限不足',
        timestamp: new Date().toISOString()
      };
    }
  };
};

/**
 * 车辆维修系统专用访问控制中间件
 * 根据业务规则进行访问控制
 */
const checkVehicleRepairAccess = async (ctx, next) => {
  // 公共路径，不需要认证
  const publicPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register', 
    '/api/v1/auth/refresh',
    '/api/v1/healthz',
    '/api/v1/openapi.json',
    '/api/v1/docs'
  ];
  
  // 静态文件路径前缀
  const staticPathPrefix = '/api/v1/static/';
  
  // 如果是公共路径或静态文件路径，直接允许访问
  if (publicPaths.includes(ctx.path) || ctx.path.startsWith(staticPathPrefix)) {
    return await next();
  }
  
  // 如果未认证，拒绝访问
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = {
      status: 'error',
      code: 'AUTHENTICATION_ERROR',
      message: '请先登录',
      timestamp: new Date().toISOString()
    };
    return;
  }
  
  const userRole = ctx.state.user.role;
  const userId = ctx.state.user.id;
  
  // 管理员有全局访问权限
  if (userRole === ROLES.ADMIN) {
    return await next();
  }
  
  // 客户访问控制
  if (userRole === ROLES.CUSTOMER) {
    // 客户只能访问自己的资源和公共接口
    const customerAllowedPaths = [
      /^\/api\/v1\/auth\/.*/,           // 认证相关
      /^\/api\/v1\/users\/me(\/.*)?$/,  // 自己的用户信息
      /^\/api\/v1\/vehicles(\/.*)?$/,   // 自己的车辆信息
      /^\/api\/v1\/work-orders(\/.*)?$/ // 自己的工单信息
    ];
    
    const isAllowed = customerAllowedPaths.some(pattern => pattern.test(ctx.path));
    
    if (!isAllowed) {
      logger.warn(`客户尝试访问未授权路径: ${ctx.path}`);
      ctx.status = 403;
      ctx.body = {
        status: 'error',
        code: 'AUTHORIZATION_ERROR',
        message: '客户无权访问此资源',
        timestamp: new Date().toISOString()
      };
      return;
    }
  }
  
  // 技师访问控制
  if (userRole === ROLES.MECHANIC) {
    // 技师可以访问自己的信息和分配的工单
    const mechanicAllowedPaths = [
      /^\/api\/v1\/auth\/.*/,               // 认证相关
      /^\/api\/v1\/mechanics\/me(\/.*)?$/,  // 自己的技师信息
      /^\/api\/v1\/work-orders(\/.*)?$/     // 工单相关（需要进一步检查是否分配给自己）
    ];
    
    const isAllowed = mechanicAllowedPaths.some(pattern => pattern.test(ctx.path));
    
    if (!isAllowed) {
      logger.warn(`技师尝试访问未授权路径: ${ctx.path}`);
      ctx.status = 403;
      ctx.body = {
        status: 'error',
        code: 'AUTHORIZATION_ERROR',
        message: '技师无权访问此资源',
        timestamp: new Date().toISOString()
      };
      return;
    }
  }
  
  // 记录访问日志
  logger.info(`用户 ${userId}(${userRole}) 访问: ${ctx.method} ${ctx.path}`);
  
  return await next();
};

/**
 * 通用访问控制中间件（保持原有逻辑兼容性）
 * 根据配置的资源访问规则验证用户权限
 */
const checkAccessControl = async (ctx, next) => {
  // 公共路径，不需要认证
  const publicPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
    '/api/v1/healthz',
    '/api/v1/openapi.json',
    '/api/v1/docs'
  ];
  
  // 静态文件路径前缀
  const staticPathPrefix = '/api/v1/static/';
  
  // 如果是公共路径或静态文件路径，直接允许访问
  if (publicPaths.includes(ctx.path) || ctx.path.startsWith(staticPathPrefix)) {
    return await next();
  }
  
  // 如果未认证，拒绝访问
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = {
      status: 'error',
      code: 'AUTHENTICATION_ERROR',
      message: '请先登录',
      timestamp: new Date().toISOString()
    };
    return;
  }
  
  const userRole = ctx.state.user.role;
  const userId = ctx.state.user.id;
  
  // 管理员有全局访问权限
  if (userRole === ROLES.ADMIN) {
    return await next();
  }
  
  // 根据路径匹配访问规则
  let matchedRule = null;
  for (const rule of resourceAccessRules) {
    if (rule.pathPattern.test(ctx.path)) {
      matchedRule = rule;
      break;
    }
  }
  
  // 如果没有匹配的规则，默认拒绝访问
  if (!matchedRule) {
    logger.warn(`未找到匹配的访问规则: ${ctx.path}`);
    ctx.status = 403;
    ctx.body = {
      status: 'error',
      code: 'AUTHORIZATION_ERROR',
      message: '无权访问此资源',
      timestamp: new Date().toISOString()
    };
    return;
  }
  
  // 检查用户角色对应的访问权限
  const accessType = matchedRule.access[userRole];
  
  if (!accessType || accessType === ACCESS.NONE) {
    logger.warn(`用户角色 ${userRole} 无权访问: ${ctx.path}`);
    ctx.status = 403;
    ctx.body = {
      status: 'error',
      code: 'AUTHORIZATION_ERROR',
      message: '无权访问此资源',
      timestamp: new Date().toISOString()
    };
    return;
  }
  
  // 如果是全部访问权限，直接通过
  if (accessType === ACCESS.ALL) {
    return await next();
  }
  
  // 对于需要检查所有权的资源
  if (accessType === ACCESS.OWN) {
    // 在路径中寻找资源ID参数
    const resourceIdMatch = ctx.path.match(/\/([^\/]+)\/(\d+)/);
    const resourceId = resourceIdMatch ? resourceIdMatch[2] : null;
    
    // 对于查看/更新自己的资料
    if (ctx.path.includes('/users/me') || ctx.path.includes('/mechanics/me')) {
      return await next();
    }
    
    // 如果是列表操作，通常只显示用户自己的资源，交由控制器处理
    if (ctx.method === 'GET' && !resourceId) {
      return await next();
    }
    
    // TODO: 实际项目中，需要根据资源类型从数据库查询资源所有者
    // 这里简化处理，在生产环境中需要完善
    logger.info(`检查资源所有权: ${ctx.path}, userId: ${userId}, resourceId: ${resourceId}`);
    
    // 临时允许访问，实际项目中需要替换为真实的所有权检查
    return await next();
  }
  
  // 对于需要检查分配关系的资源（如技师查看分配给自己的工单）
  if (accessType === ACCESS.ASSIGNED) {
    // TODO: 实际项目中，需要根据资源类型从数据库查询分配关系
    // 这里简化处理，在生产环境中需要完善
    logger.info(`检查资源分配关系: ${ctx.path}, userId: ${userId}`);
    
    // 临时允许访问，实际项目中需要替换为真实的分配关系检查
    return await next();
  }
  
  // 默认拒绝访问
  logger.warn(`未处理的访问控制情况: ${ctx.path}, role: ${userRole}, accessType: ${accessType}`);
  ctx.status = 403;
  ctx.body = {
    status: 'error',
    code: 'AUTHORIZATION_ERROR',
    message: '无权访问此资源',
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireOwnership,
  createAuthzError,
  AuthorizationError,
  checkAccessControl,
  checkVehicleRepairAccess
};
