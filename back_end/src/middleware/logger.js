/**
 * 日志记录中间件 - Logger Middleware
 * 
 * 功能说明：
 * - 记录所有请求和响应的详细信息
 * - 支持不同级别的日志记录（info, warn, error, debug）
 * - 记录请求处理时间
 * - 格式化日志输出
 * 
 * 车辆维修管理系统特定功能：
 * - 记录业务操作日志（工单状态变更、材料使用等）
 * - 按角色记录操作日志
 * - 记录敏感操作审计日志
 */

const { ErrorTypes } = require('./errorhandler');

/**
 * 日志级别定义
 */
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  AUDIT: 'audit'  // 审计日志
};

/**
 * 车辆维修系统业务操作类型
 */
const BusinessOperation = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  WORK_ORDER_CREATE: 'work_order_create',
  WORK_ORDER_ACCEPT: 'work_order_accept',
  WORK_ORDER_COMPLETE: 'work_order_complete',
  VEHICLE_ADD: 'vehicle_add',
  VEHICLE_UPDATE: 'vehicle_update',
  MATERIAL_RECORD: 'material_record',
  FEEDBACK_SUBMIT: 'feedback_submit',
  PAYMENT_PROCESS: 'payment_process',
  ADMIN_OPERATION: 'admin_operation'
};

/**
 * 日志相关错误类
 */
class LoggingError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = ErrorTypes.INTERNAL_ERROR.status;
    this.code = 'LOGGING_ERROR';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 格式化日志输出
 * 
 * @param {Object} data - 日志数据
 * @param {String} level - 日志级别
 * @returns {String} - 格式化后的日志字符串
 */
const formatLog = (data, level = LogLevel.INFO) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (typeof data === 'string') {
    return `${prefix} ${data}`;
  }
  
  // 确保不记录敏感信息
  const safeData = sanitizeLogData(data);
  
  return `${prefix} ${JSON.stringify(safeData, null, 2)}`;
};

/**
 * 清理敏感信息
 * @param {Object} data - 原始数据
 * @returns {Object} - 清理后的数据
 */
const sanitizeLogData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const safeData = { ...data };
  
  // 递归清理敏感字段
  const cleanObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const cleaned = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        cleaned[key] = '******';
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = cleanObject(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  };
  
  return cleanObject(safeData);
};

/**
 * 记录请求日志
 * 
 * @param {Object} ctx - Koa上下文
 */
const logRequest = (ctx) => {
  const { method, url, headers, query, body } = ctx.request;
  const user = ctx.state.user;
  
  const requestData = {
    type: 'request',
    method,
    url,
    query,
    headers: {
      'user-agent': headers['user-agent'],
      'content-type': headers['content-type'],
      'accept': headers['accept'],
      'authorization': headers['authorization'] ? '******' : undefined
    },
    user: user ? {
      id: user.id,
      role: user.role,
      username: user.username
    } : null,
    ip: ctx.ip,
    id: ctx.state.requestId
  };
  
  // 不记录敏感信息如密码
  if (body && typeof body === 'object') {
    requestData.body = sanitizeLogData(body);
  }
  
  console.log(formatLog(requestData));
};

/**
 * 记录响应日志
 * 
 * @param {Object} ctx - Koa上下文
 * @param {Number} startTime - 请求开始时间
 */
const logResponse = (ctx, startTime) => {
  const responseTime = Date.now() - startTime;
  const { status, body } = ctx.response;
  const user = ctx.state.user;
  
  // 不记录敏感信息
  let responseBody = body;
  if (body && typeof body === 'object') {
    responseBody = sanitizeLogData(body);
  }
  
  const level = status >= 500 ? LogLevel.ERROR : 
                status >= 400 ? LogLevel.WARN : 
                LogLevel.INFO;
  
  const responseData = {
    type: 'response',
    status,
    body: responseBody,
    responseTime: `${responseTime}ms`,
    user: user ? {
      id: user.id,
      role: user.role
    } : null,
    id: ctx.state.requestId
  };
  
  console.log(formatLog(responseData, level));
};

/**
 * 记录错误日志
 * 
 * @param {Error} error - 错误对象
 * @param {Object} ctx - Koa上下文
 */
const logError = (error, ctx) => {
  const user = ctx.state.user;
  
  const errorData = {
    type: 'error',
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stack: error.stack,
    url: ctx.url,
    method: ctx.method,
    user: user ? {
      id: user.id,
      role: user.role,
      username: user.username
    } : null,
    id: ctx.state.requestId
  };
  
  console.error(formatLog(errorData, LogLevel.ERROR));
};

/**
 * 记录业务操作日志
 * 
 * @param {String} operation - 操作类型
 * @param {Object} data - 操作数据
 * @param {Object} user - 用户信息
 */
const logBusinessOperation = (operation, data, user) => {
  const businessData = {
    type: 'business_operation',
    operation,
    data: sanitizeLogData(data),
    user: user ? {
      id: user.id,
      role: user.role,
      username: user.username
    } : null,
    timestamp: new Date().toISOString()
  };
  
  console.log(formatLog(businessData, LogLevel.INFO));
};

/**
 * 记录审计日志
 * 
 * @param {String} action - 审计动作
 * @param {Object} details - 详细信息
 * @param {Object} user - 用户信息
 */
const logAudit = (action, details, user) => {
  const auditData = {
    type: 'audit',
    action,
    details: sanitizeLogData(details),
    user: user ? {
      id: user.id,
      role: user.role,
      username: user.username
    } : null,
    timestamp: new Date().toISOString()
  };
  
  console.log(formatLog(auditData, LogLevel.AUDIT));
};

/**
 * 日志中间件
 * 记录请求和响应信息
 */
const loggerMiddleware = async (ctx, next) => {
  // 生成请求ID
  ctx.state.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  // 记录请求信息
  logRequest(ctx);
  
  const startTime = Date.now();
  
  try {
    await next();
    
    // 记录特定业务操作
    recordBusinessOperations(ctx);
    
  } catch (error) {
    // 记录错误日志
    logError(error, ctx);
    throw error;
  } finally {
    // 记录响应信息
    logResponse(ctx, startTime);
  }
};

/**
 * 记录业务操作
 * @param {Object} ctx - Koa上下文
 */
const recordBusinessOperations = (ctx) => {
  const { method, path } = ctx;
  const user = ctx.state.user;
  
  // 根据路径和方法判断业务操作类型
  if (path === '/api/v1/auth/login' && method === 'POST' && ctx.status === 200) {
    logBusinessOperation(BusinessOperation.USER_LOGIN, { path }, user);
  } else if (path === '/api/v1/auth/logout' && method === 'POST') {
    logBusinessOperation(BusinessOperation.USER_LOGOUT, { path }, user);
  } else if (path === '/api/v1/work-orders' && method === 'POST') {
    logBusinessOperation(BusinessOperation.WORK_ORDER_CREATE, { path }, user);
  } else if (path.includes('/work-orders/') && path.includes('/accept') && method === 'POST') {
    logBusinessOperation(BusinessOperation.WORK_ORDER_ACCEPT, { path }, user);
  } else if (path.includes('/work-orders/') && path.includes('/complete') && method === 'PATCH') {
    logBusinessOperation(BusinessOperation.WORK_ORDER_COMPLETE, { path }, user);
  } else if (path === '/api/v1/vehicles' && method === 'POST') {
    logBusinessOperation(BusinessOperation.VEHICLE_ADD, { path }, user);
  } else if (path.includes('/vehicles/') && method === 'PATCH') {
    logBusinessOperation(BusinessOperation.VEHICLE_UPDATE, { path }, user);
  } else if (path.includes('/work-orders/') && path.includes('/materials') && method === 'POST') {
    logBusinessOperation(BusinessOperation.MATERIAL_RECORD, { path }, user);
  } else if (path.includes('/work-orders/') && path.includes('/feedback') && method === 'POST') {
    logBusinessOperation(BusinessOperation.FEEDBACK_SUBMIT, { path }, user);
  } else if (path.includes('/admin/') && user && user.role === 'admin') {
    logBusinessOperation(BusinessOperation.ADMIN_OPERATION, { path, method }, user);
  }
};

/**
 * 创建日志记录器
 * 用于在应用的任何位置记录日志
 */
const createLogger = (module) => {
  return {
    debug: (message) => console.debug(formatLog(`[${module}] ${message}`, LogLevel.DEBUG)),
    info: (message) => console.info(formatLog(`[${module}] ${message}`, LogLevel.INFO)),
    warn: (message) => console.warn(formatLog(`[${module}] ${message}`, LogLevel.WARN)),
    error: (message, error) => {
      const errorMsg = error ? `${message}: ${error.message}` : message;
      console.error(formatLog(`[${module}] ${errorMsg}`, LogLevel.ERROR));
      if (error && error.stack) {
        console.error(formatLog(`[${module}] Stack: ${error.stack}`, LogLevel.ERROR));
      }
    },
    audit: (action, details, user) => {
      logAudit(`[${module}] ${action}`, details, user);
    },
    business: (operation, data, user) => {
      logBusinessOperation(`[${module}] ${operation}`, data, user);
    }
  };
};

module.exports = {
  loggerMiddleware,
  createLogger,
  logError,
  logBusinessOperation,
  logAudit,
  LogLevel,
  BusinessOperation,
  LoggingError
};
