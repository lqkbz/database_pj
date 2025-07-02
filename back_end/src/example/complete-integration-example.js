/**
 * 完整的错误处理集成示例
 * 演示如何在实际项目中综合使用所有错误处理组件
 */

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

// 导入错误处理组件
const { errorHandler, createError } = require('../middleware/errorhandler');

/**
 * 1. 应用级别的错误处理配置
 */
function setupErrorHandling(app) {
  // 全局错误处理中间件（应该是最后注册的中间件）
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      // 使用统一的错误处理器
      await errorHandler(error, ctx);
    }
  });
  
  // 404处理
  app.use(async (ctx, next) => {
    await next();
    if (ctx.status === 404) {
      throw createError.notFound(`路径 ${ctx.path} 不存在`);
    }
  });
}

/**
 * 2. 路由级别的错误处理示例
 */
const router = new Router({ prefix: '/api/v1' });

// 用户注册示例
router.post('/auth/register', async (ctx) => {
  try {
    const { username, password } = ctx.request.body;
    
    // 基础验证
    if (!username || !password) {
      ctx.status = 400;
      ctx.body = {
        status: 'error',
        message: '缺少必要字段'
      };
      return;
    }
    
    // 示例：简单格式验证
    if (username.length < 3) {
      ctx.status = 400;
      ctx.body = {
        status: 'error',
        message: '用户名至少3个字符'
      };
      return;
    }
    
    // 示例：模拟用户名冲突检查
    if (username === 'admin') {
      ctx.status = 409;
      ctx.body = {
        status: 'error',
        message: '用户名已存在'
      };
      return;
    }
    
    // 创建用户（模拟）
    const newUser = {
      id: Date.now().toString(),
      username,
      createdAt: new Date().toISOString()
    };
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '注册成功',
      data: {
        user: newUser
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '注册失败',
      error: error.message
    };
  }
});

/**
 * 3. 使用指南总结
 */
const usageGuide = {
  summary: `
    错误处理最佳实践总结：
    
    1. 统一模式：全局错误处理 + 业务层错误判断
    2. 使用 createError 创建标准化错误
    3. 业务逻辑中只关注错误判断，不处理HTTP响应
    4. 中间件负责验证和权限检查
    5. 控制器只处理成功情况，错误让全局处理器处理
    6. 为特定业务创建自定义错误类型
  `,
  
  errorhandlerExample: `
    errorhandler-example.js 导出的模块使用方法：
    
    1. 直接导入控制器函数：
       const { registerUser, loginUser } = require('../middleware/errorhandler-example');
       router.post('/register', registerUser);
    
    2. 导入中间件函数：
       const { authMiddleware, requireRole } = require('../middleware/errorhandler-example');
       router.get('/admin', authMiddleware, requireRole(['admin']), handler);
    
    3. 导入自定义错误类：
       const { VehicleMaintenanceError } = require('../middleware/errorhandler-example');
       throw new VehicleMaintenanceError('维修中', vehicleId);
  `
};

module.exports = {
  setupErrorHandling,
  router,
  usageGuide
}; 