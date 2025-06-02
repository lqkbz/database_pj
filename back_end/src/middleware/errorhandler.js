/**
 * 错误处理中间件 - Error Handler Middleware
 * 
 * 功能说明：
 * - 统一处理应用中的所有错误
 * - 返回标准化的错误响应格式
 * - 记录错误日志
 * - 区分开发环境和生产环境的错误信息
 */

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, errorType = ErrorTypes.INTERNAL_ERROR, details = null) {
    super(message);
    this.statusCode = errorType.status;
    this.code = errorType.code;
    this.isOperational = true;
    if (details) this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 预定义的错误类型
 */
const ErrorTypes = {
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  AUTHENTICATION_ERROR: { code: 'AUTHENTICATION_ERROR', status: 401 },
  AUTHORIZATION_ERROR: { code: 'AUTHORIZATION_ERROR', status: 403 },
  NOT_FOUND_ERROR: { code: 'NOT_FOUND_ERROR', status: 404 },
  CONFLICT_ERROR: { code: 'CONFLICT_ERROR', status: 409 },
  RATE_LIMIT_ERROR: { code: 'RATE_LIMIT_ERROR', status: 429 },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', status: 500 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 }
};

/**
 * 错误处理中间件
 */
const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // 记录错误日志
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      url: ctx.url,
      method: ctx.method,
      ip: ctx.ip,
      userAgent: ctx.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    // 设置错误响应
    const errorResponse = formatError(error, ctx);
    
    ctx.status = errorResponse.status;
    ctx.body = errorResponse.body;
    
    // 触发错误事件（可用于额外的错误处理，如发送通知）
    ctx.app.emit('error', error, ctx);
  }
};

/**
 * 格式化错误响应
 */
function formatError(error, ctx) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // 默认错误信息
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = '服务器内部错误';
  let details = null;

  // 处理自定义应用错误
  if (error instanceof AppError) {
    status = error.statusCode;
    code = error.code;
    message = error.message;
  }
  // 处理验证错误
  else if (error.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = '数据验证失败';
    details = error.details || error.message;
  }
  // 处理数据库错误
  else if (error.code === 'ER_DUP_ENTRY') {
    status = 409;
    code = 'CONFLICT_ERROR';
    message = '数据已存在，请检查唯一性约束';
  }
  else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = '关联数据不存在';
  }
  else if (error.code && error.code.startsWith('ER_')) {
    status = 500;
    code = 'DATABASE_ERROR';
    message = '数据库操作失败';
  }
  // 处理文件上传错误
  else if (error.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'VALIDATION_ERROR';
    message = '文件大小超出限制';
  }
  else if (error.code === 'LIMIT_FILE_COUNT') {
    status = 413;
    code = 'VALIDATION_ERROR';
    message = '文件数量超出限制';
  }
  // 处理网络错误
  else if (error.code === 'ECONNREFUSED') {
    status = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = '外部服务不可用';
  }

  // 构建响应体
  const responseBody = {
    status: 'error',
    code,
    message,
    timestamp: new Date().toISOString(),
    path: ctx.url,
    method: ctx.method
  };

  // 开发环境返回详细错误信息
  if (isDevelopment) {
    responseBody.details = details || error.message;
    responseBody.stack = error.stack;
  }

  // 生产环境只返回安全的错误信息
  if (!isDevelopment && status === 500) {
    responseBody.message = '服务器内部错误';
  }

  return {
    status,
    body: responseBody
  };
}

/**
 * 404 错误处理中间件
 */
const notFoundHandler = async (ctx, next) => {
  await next();
  
  if (ctx.status === 404 && !ctx.body) {
    ctx.status = 404;
    ctx.body = {
      status: 'error',
      code: 'NOT_FOUND',
      message: '请求的资源不存在',
      path: ctx.url,
      method: ctx.method,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 创建通用错误的辅助函数
 */
const createError = {
  validation: (message, details = null) => {
    return new AppError(message, ErrorTypes.VALIDATION_ERROR, details);
  },
  
  notFound: (message = '资源不存在') => {
    return new AppError(message, ErrorTypes.NOT_FOUND_ERROR);
  },
  
  conflict: (message = '数据冲突') => {
    return new AppError(message, ErrorTypes.CONFLICT_ERROR);
  },
  
  rateLimit: (message = '请求频率过高') => {
    return new AppError(message, ErrorTypes.RATE_LIMIT_ERROR);
  },
  
  database: (message = '数据库操作失败') => {
    return new AppError(message, ErrorTypes.DATABASE_ERROR);
  },
  
  internal: (message = '服务器内部错误') => {
    return new AppError(message, ErrorTypes.INTERNAL_ERROR);
  }
};

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError,
  ErrorTypes,
  createError
};
