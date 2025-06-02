/**
 * 日志记录中间件 - Logger Middleware
 * 
 * 功能说明：
 * - 记录所有请求和响应的详细信息
 * - 支持不同级别的日志记录（info, warn, error, debug）
 * - 记录请求处理时间
 * - 格式化日志输出
 */

const { ErrorTypes } = require('./errorhandler');

/**
 * 日志级别定义
 */
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
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
  
  return `${prefix} ${JSON.stringify(data)}`;
};

/**
 * 记录请求日志
 * 
 * @param {Object} ctx - Koa上下文
 */
const logRequest = (ctx) => {
  const { method, url, headers, query, body } = ctx.request;
  const requestData = {
    method,
    url,
    query,
    headers: {
      'user-agent': headers['user-agent'],
      'content-type': headers['content-type'],
      'accept': headers['accept'],
      'authorization': headers['authorization'] ? '******' : undefined
    }
  };
  
  // 不记录敏感信息如密码
  if (body && typeof body === 'object') {
    const safeBody = { ...body };
    if (safeBody.password) safeBody.password = '******';
    if (safeBody.token) safeBody.token = '******';
    requestData.body = safeBody;
  }
  
  console.log(formatLog({
    type: 'request',
    ...requestData,
    ip: ctx.ip,
    id: ctx.state.requestId
  }));
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
  
  // 不记录敏感信息
  let responseBody = body;
  if (body && typeof body === 'object') {
    responseBody = { ...body };
    if (responseBody.token) responseBody.token = '******';
  }
  
  const level = status >= 500 ? LogLevel.ERROR : 
                status >= 400 ? LogLevel.WARN : 
                LogLevel.INFO;
  
  console.log(formatLog({
    type: 'response',
    status,
    body: responseBody,
    responseTime: `${responseTime}ms`,
    id: ctx.state.requestId
  }, level));
};

/**
 * 记录错误日志
 * 
 * @param {Error} error - 错误对象
 * @param {Object} ctx - Koa上下文
 */
const logError = (error, ctx) => {
  const errorData = {
    type: 'error',
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stack: error.stack,
    url: ctx.url,
    method: ctx.method,
    id: ctx.state.requestId
  };
  
  console.error(formatLog(errorData, LogLevel.ERROR));
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
    }
  };
};

module.exports = {
  loggerMiddleware,
  createLogger,
  logError,
  LogLevel,
  LoggingError
};
