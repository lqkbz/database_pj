/**
 * 错误处理中间件 - Error Handler Middleware
 * 
 * 功能说明：
 * - 统一处理应用中的所有错误
 * - 返回标准化的错误响应格式
 * - 记录错误日志
 * - 区分开发环境和生产环境的错误信息
 * 
 * 车辆维修管理系统特定功能：
 * - 处理业务逻辑错误（工单状态冲突、库存不足等）
 * - 处理数据完整性错误
 * - 提供中文错误消息
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
 * 业务逻辑错误类
 */
class BusinessError extends Error {
  constructor(message, code = 'BUSINESS_ERROR', statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.isBusiness = true;
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
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
  // 车辆维修系统特定错误类型
  WORK_ORDER_ERROR: { code: 'WORK_ORDER_ERROR', status: 400 },
  VEHICLE_ERROR: { code: 'VEHICLE_ERROR', status: 400 },
  MECHANIC_ERROR: { code: 'MECHANIC_ERROR', status: 400 },
  INVENTORY_ERROR: { code: 'INVENTORY_ERROR', status: 400 },
  PAYMENT_ERROR: { code: 'PAYMENT_ERROR', status: 400 }
};

/**
 * 车辆维修系统业务错误代码
 */
const BusinessErrorCodes = {
  // 工单相关错误
  WORK_ORDER_NOT_FOUND: 'WORK_ORDER_NOT_FOUND',
  WORK_ORDER_STATUS_INVALID: 'WORK_ORDER_STATUS_INVALID',
  WORK_ORDER_ALREADY_ACCEPTED: 'WORK_ORDER_ALREADY_ACCEPTED',
  WORK_ORDER_ALREADY_COMPLETED: 'WORK_ORDER_ALREADY_COMPLETED',
  WORK_ORDER_NOT_ASSIGNED: 'WORK_ORDER_NOT_ASSIGNED',
  
  // 车辆相关错误
  VEHICLE_NOT_FOUND: 'VEHICLE_NOT_FOUND',
  VEHICLE_ALREADY_EXISTS: 'VEHICLE_ALREADY_EXISTS',
  VEHICLE_IN_MAINTENANCE: 'VEHICLE_IN_MAINTENANCE',
  
  // 用户相关错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_NOT_VERIFIED: 'USER_NOT_VERIFIED',
  
  // 技师相关错误
  MECHANIC_NOT_FOUND: 'MECHANIC_NOT_FOUND',
  MECHANIC_NOT_AVAILABLE: 'MECHANIC_NOT_AVAILABLE',
  MECHANIC_OVERLOADED: 'MECHANIC_OVERLOADED',
  
  // 库存相关错误
  PART_NOT_FOUND: 'PART_NOT_FOUND',
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  INVENTORY_LOCKED: 'INVENTORY_LOCKED',
  
  // 支付相关错误
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED'
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
      code: error.code,
      stack: error.stack,
      url: ctx.url,
      method: ctx.method,
      ip: ctx.ip,
      userAgent: ctx.headers['user-agent'],
      user: ctx.state.user ? {
        id: ctx.state.user.id,
        role: ctx.state.user.role,
        username: ctx.state.user.username
      } : null,
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
  if (error instanceof AppError || error instanceof BusinessError) {
    status = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  }
  // 处理业务逻辑错误
  else if (error.isBusiness) {
    status = error.statusCode || 400;
    code = error.code || 'BUSINESS_ERROR';
    message = error.message;
    details = error.details;
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
    // 解析重复字段信息
    if (error.message.includes('license_plate')) {
      message = '该车牌号已存在';
    } else if (error.message.includes('username')) {
      message = '用户名已被使用';
    } else if (error.message.includes('email')) {
      message = '邮箱已被注册';
    } else {
      message = '数据已存在，请检查唯一性约束';
    }
  }
  else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = '关联数据不存在';
  }
  else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    status = 400;
    code = 'CONFLICT_ERROR';
    message = '无法删除，存在关联数据';
  }
  else if (error.code && error.code.startsWith('ER_')) {
    status = 500;
    code = 'DATABASE_ERROR';
    message = '数据库操作失败';
  }
  // 处理JWT错误
  else if (error.name === 'JsonWebTokenError') {
    status = 401;
    code = 'AUTHENTICATION_ERROR';
    message = '无效的认证令牌';
  }
  else if (error.name === 'TokenExpiredError') {
    status = 401;
    code = 'AUTHENTICATION_ERROR';
    message = '认证令牌已过期';
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
  // 处理参数错误
  else if (error.name === 'CastError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = '参数格式错误';
  }

  // 构建响应体
  const responseBody = {
    status: 'error',
    code,
    message,
    timestamp: new Date().toISOString(),
    path: ctx.url,
    method: ctx.method,
    requestId: ctx.state.requestId
  };

  // 添加用户信息（如果有）
  if (ctx.state.user) {
    responseBody.user = {
      id: ctx.state.user.id,
      role: ctx.state.user.role
    };
  }

  // 开发环境返回详细错误信息
  if (isDevelopment) {
    responseBody.details = details || error.message;
    responseBody.stack = error.stack;
  } else {
    // 生产环境只在特定情况下返回详细信息
    if (details && (status < 500 || error.isOperational)) {
      responseBody.details = details;
    }
  }

  // 生产环境只返回安全的错误信息
  if (!isDevelopment && status === 500 && !error.isOperational) {
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
      timestamp: new Date().toISOString(),
      requestId: ctx.state.requestId
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
  },

  // 车辆维修系统特定错误创建函数
  workOrder: (message, code = BusinessErrorCodes.WORK_ORDER_STATUS_INVALID) => {
    return new BusinessError(message, code, 400);
  },

  vehicle: (message, code = BusinessErrorCodes.VEHICLE_NOT_FOUND) => {
    return new BusinessError(message, code, 400);
  },

  mechanic: (message, code = BusinessErrorCodes.MECHANIC_NOT_AVAILABLE) => {
    return new BusinessError(message, code, 400);
  },

  inventory: (message, code = BusinessErrorCodes.INSUFFICIENT_INVENTORY) => {
    return new BusinessError(message, code, 400);
  },

  payment: (message, code = BusinessErrorCodes.PAYMENT_FAILED) => {
    return new BusinessError(message, code, 400);
  }
};

/**
 * 创建业务错误的辅助函数
 */
const createBusinessError = {
  // 工单相关错误
  workOrderNotFound: () => {
    return new BusinessError('工单不存在', BusinessErrorCodes.WORK_ORDER_NOT_FOUND, 404);
  },

  workOrderAlreadyAccepted: () => {
    return new BusinessError('工单已被接收', BusinessErrorCodes.WORK_ORDER_ALREADY_ACCEPTED, 409);
  },

  workOrderAlreadyCompleted: () => {
    return new BusinessError('工单已完成', BusinessErrorCodes.WORK_ORDER_ALREADY_COMPLETED, 409);
  },

  workOrderNotAssigned: () => {
    return new BusinessError('工单未分配给您', BusinessErrorCodes.WORK_ORDER_NOT_ASSIGNED, 403);
  },

  // 车辆相关错误
  vehicleNotFound: () => {
    return new BusinessError('车辆不存在', BusinessErrorCodes.VEHICLE_NOT_FOUND, 404);
  },

  vehicleAlreadyExists: () => {
    return new BusinessError('车辆已存在', BusinessErrorCodes.VEHICLE_ALREADY_EXISTS, 409);
  },

  vehicleInMaintenance: () => {
    return new BusinessError('车辆正在维修中', BusinessErrorCodes.VEHICLE_IN_MAINTENANCE, 409);
  },

  // 技师相关错误
  mechanicNotAvailable: () => {
    return new BusinessError('技师不可用', BusinessErrorCodes.MECHANIC_NOT_AVAILABLE, 409);
  },

  mechanicOverloaded: () => {
    return new BusinessError('技师工作量已满', BusinessErrorCodes.MECHANIC_OVERLOADED, 409);
  },

  // 库存相关错误
  insufficientInventory: (partName) => {
    return new BusinessError(`配件库存不足: ${partName}`, BusinessErrorCodes.INSUFFICIENT_INVENTORY, 400);
  },

  inventoryLocked: () => {
    return new BusinessError('库存已被锁定', BusinessErrorCodes.INVENTORY_LOCKED, 409);
  },

  // 支付相关错误
  paymentFailed: (reason) => {
    return new BusinessError(`支付失败: ${reason}`, BusinessErrorCodes.PAYMENT_FAILED, 400);
  },

  insufficientBalance: () => {
    return new BusinessError('余额不足', BusinessErrorCodes.INSUFFICIENT_BALANCE, 400);
  }
};

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError,
  BusinessError,
  ErrorTypes,
  BusinessErrorCodes,
  createError,
  createBusinessError
};
