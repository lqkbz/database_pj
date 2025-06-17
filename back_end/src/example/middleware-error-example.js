/**
 * 中间件错误处理示例
 * 演示在中间件中如何进行错误判断和处理
 */

const jwt = require('jsonwebtoken');
const { createError } = require('../middleware/errorhandler');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('Middleware');

/**
 * 身份认证中间件
 * 演示：Token验证、用户状态检查
 */
const authMiddleware = async (ctx, next) => {
  try {
    // 1. 检查Authorization头
    const authHeader = ctx.headers.authorization;
    if (!authHeader) {
      throw createError.authentication('缺少认证头');
    }
    
    // 2. 检查Token格式
    if (!authHeader.startsWith('Bearer ')) {
      throw createError.authentication('认证头格式错误，应为: Bearer <token>');
    }
    
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw createError.authentication('缺少认证令牌');
    }
    
    // 3. 验证Token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    } catch (jwtError) {
      // 具体的JWT错误处理
      switch (jwtError.name) {
        case 'TokenExpiredError':
          throw createError.authentication('令牌已过期', {
            expiredAt: jwtError.expiredAt
          });
        case 'JsonWebTokenError':
          throw createError.authentication('无效的令牌');
        case 'NotBeforeError':
          throw createError.authentication('令牌尚未生效');
        default:
          logger.error('JWT验证失败', jwtError);
          throw createError.authentication('令牌验证失败');
      }
    }
    
    // 4. 检查用户状态（模拟数据库查询）
    const user = await getUserById(decoded.id);
    if (!user) {
      throw createError.authentication('用户不存在');
    }
    
    if (user.status === 'disabled') {
      throw createError.forbidden('账户已被禁用');
    }
    
    if (user.status === 'suspended') {
      throw createError.forbidden('账户已被暂停');
    }
    
    // 5. 检查Token是否在黑名单中
    const isBlacklisted = await checkTokenBlacklist(token);
    if (isBlacklisted) {
      throw createError.authentication('令牌已失效');
    }
    
    // 6. 将用户信息附加到context
    ctx.state.user = user;
    ctx.state.token = token;
    
    logger.info(`用户 ${user.id} 通过认证`);
    
    // 继续处理下一个中间件
    await next();
    
  } catch (error) {
    // 记录认证失败日志
    logger.warn(`认证失败: ${error.message}`, {
      ip: ctx.ip,
      userAgent: ctx.headers['user-agent'],
      path: ctx.path
    });
    
    // 重新抛出错误，让全局错误处理中间件处理
    throw error;
  }
};

/**
 * 权限检查中间件工厂
 * 演示：角色权限验证
 */
const requireRole = (allowedRoles) => {
  return async (ctx, next) => {
    try {
      // 1. 检查是否已认证
      const user = ctx.state.user;
      if (!user) {
        throw createError.authentication('请先登录');
      }
      
      // 2. 检查角色权限
      if (!allowedRoles.includes(user.role)) {
        throw createError.authorization(`需要 ${allowedRoles.join(' 或 ')} 权限`, {
          requiredRoles: allowedRoles,
          userRole: user.role
        });
      }
      
      // 3. 检查特殊权限限制
      await checkSpecialPermissions(user, ctx);
      
      logger.info(`用户 ${user.id} 通过权限检查: ${allowedRoles.join(',')}`);
      
      await next();
      
    } catch (error) {
      logger.warn(`权限检查失败: ${error.message}`, {
        userId: ctx.state.user?.id,
        requiredRoles: allowedRoles,
        userRole: ctx.state.user?.role,
        path: ctx.path
      });
      
      throw error;
    }
  };
};

/**
 * 请求频率限制中间件
 * 演示：Rate Limiting
 */
const rateLimitMiddleware = (options = {}) => {
  const {
    maxRequests = 100,
    windowMs = 15 * 60 * 1000, // 15分钟
    keyGenerator = (ctx) => ctx.ip,
    skipSuccessfulRequests = false
  } = options;
  
  // 简单的内存存储（生产环境应使用Redis）
  const requestCounts = new Map();
  
  return async (ctx, next) => {
    try {
      const key = keyGenerator(ctx);
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // 1. 获取当前窗口的请求记录
      let requests = requestCounts.get(key) || [];
      
      // 2. 清理过期的请求记录
      requests = requests.filter(timestamp => timestamp > windowStart);
      
      // 3. 检查是否超出限制
      if (requests.length >= maxRequests) {
        throw createError.rateLimit(`请求过于频繁，每${Math.round(windowMs / 60000)}分钟最多${maxRequests}次请求`, {
          limit: maxRequests,
          windowMs,
          retryAfter: Math.round((requests[0] + windowMs - now) / 1000)
        });
      }
      
      // 4. 记录当前请求
      requests.push(now);
      requestCounts.set(key, requests);
      
      // 5. 处理请求
      await next();
      
      // 6. 如果配置了跳过成功请求，并且响应成功，则移除这次记录
      if (skipSuccessfulRequests && ctx.status < 400) {
        requests.pop();
        requestCounts.set(key, requests);
      }
      
    } catch (error) {
      logger.warn(`频率限制检查: ${error.message}`, {
        ip: ctx.ip,
        userAgent: ctx.headers['user-agent'],
        path: ctx.path
      });
      
      throw error;
    }
  };
};

/**
 * 输入验证中间件
 * 演示：请求体验证
 */
const validateInput = (schema) => {
  return async (ctx, next) => {
    try {
      // 1. 检查Content-Type
      if (ctx.request.type !== 'application/json') {
        throw createError.validation('Content-Type必须为application/json');
      }
      
      // 2. 检查请求体是否存在
      if (!ctx.request.body) {
        throw createError.validation('请求体不能为空');
      }
      
      // 3. 使用schema验证（这里简化处理）
      const errors = validateWithSchema(ctx.request.body, schema);
      if (errors.length > 0) {
        throw createError.validation('输入数据验证失败', {
          errors: errors
        });
      }
      
      logger.debug('输入验证通过', {
        path: ctx.path,
        bodyKeys: Object.keys(ctx.request.body)
      });
      
      await next();
      
    } catch (error) {
      logger.warn(`输入验证失败: ${error.message}`, {
        path: ctx.path,
        body: ctx.request.body
      });
      
      throw error;
    }
  };
};

/**
 * 文件上传中间件
 * 演示：文件处理错误
 */
const fileUploadMiddleware = (options = {}) => {
  const {
    maxFileSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    maxFiles = 1
  } = options;
  
  return async (ctx, next) => {
    try {
      // 1. 检查是否有文件上传
      const files = ctx.request.files;
      if (!files || Object.keys(files).length === 0) {
        throw createError.validation('请选择要上传的文件');
      }
      
      // 2. 检查文件数量
      const fileCount = Object.keys(files).length;
      if (fileCount > maxFiles) {
        throw createError.validation(`最多只能上传${maxFiles}个文件`);
      }
      
      // 3. 验证每个文件
      for (const [fieldName, file] of Object.entries(files)) {
        // 检查文件大小
        if (file.size > maxFileSize) {
          throw createError.validation(`文件 ${fieldName} 大小超出限制，最大${Math.round(maxFileSize / 1024 / 1024)}MB`);
        }
        
        // 检查文件类型
        if (!allowedTypes.includes(file.type)) {
          throw createError.validation(`文件 ${fieldName} 类型不支持，只支持: ${allowedTypes.join(', ')}`);
        }
        
        // 检查文件是否损坏
        if (file.size === 0) {
          throw createError.validation(`文件 ${fieldName} 为空或已损坏`);
        }
      }
      
      logger.info('文件上传验证通过', {
        fileCount,
        totalSize: Object.values(files).reduce((sum, file) => sum + file.size, 0)
      });
      
      await next();
      
    } catch (error) {
      // 清理临时文件
      if (ctx.request.files) {
        for (const file of Object.values(ctx.request.files)) {
          try {
            await cleanupTempFile(file.path);
          } catch (cleanupError) {
            logger.error('清理临时文件失败', cleanupError);
          }
        }
      }
      
      logger.error(`文件上传处理失败: ${error.message}`);
      throw error;
    }
  };
};

/**
 * 辅助函数（模拟）
 */
async function getUserById(id) {
  // 模拟数据库查询
  return {
    id: id,
    username: 'testuser',
    role: 'customer',
    status: 'active'
  };
}

async function checkTokenBlacklist(token) {
  // 模拟黑名单检查
  return false;
}

async function checkSpecialPermissions(user, ctx) {
  // 检查特殊权限限制，如账户是否在试用期等
  if (user.status === 'trial' && ctx.method !== 'GET') {
    throw createError.forbidden('试用账户只能进行查看操作');
  }
}

function validateWithSchema(data, schema) {
  // 简化的schema验证
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (!value && value !== 0)) {
      errors.push(`${field}是必填字段`);
    }
    
    if (value && rules.type && typeof value !== rules.type) {
      errors.push(`${field}类型应为${rules.type}`);
    }
    
    if (value && rules.minLength && value.length < rules.minLength) {
      errors.push(`${field}长度至少${rules.minLength}位`);
    }
  }
  
  return errors;
}

async function cleanupTempFile(filePath) {
  // 模拟清理临时文件
  logger.debug(`清理临时文件: ${filePath}`);
}

module.exports = {
  authMiddleware,
  requireRole,
  rateLimitMiddleware,
  validateInput,
  fileUploadMiddleware
}; 