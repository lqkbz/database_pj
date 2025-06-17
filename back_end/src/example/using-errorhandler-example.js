/**
 * 如何使用 errorhandler-example.js 导出模块的示例
 * 演示具体的使用场景和集成方式
 */

const Router = require('koa-router');
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  uploadAvatar, 
  createWorkOrder,
  authMiddleware,
  requireRole,
  scheduleMaintenanceCheck,
  VehicleMaintenanceError
} = require('../middleware/errorhandler-example');

// 创建路由实例
const router = new Router();
const apiRouter = new Router({ prefix: '/api/v1' });

/**
 * 1. 直接使用导出的控制器函数
 */

// 用户注册 - 使用 registerUser 控制器
apiRouter.post('/auth/register', registerUser);

// 用户登录 - 使用 loginUser 控制器
apiRouter.post('/auth/login', loginUser);

// 获取用户资料 - 使用 getUserProfile 控制器，需要认证
apiRouter.get('/users/:id', authMiddleware, getUserProfile);

// 上传头像 - 使用 uploadAvatar 控制器，需要认证
apiRouter.post('/users/avatar', authMiddleware, uploadAvatar);

// 创建工单 - 使用 createWorkOrder 控制器，需要认证
apiRouter.post('/work-orders', authMiddleware, createWorkOrder);

/**
 * 2. 使用导出的中间件
 */

// 需要管理员权限的路由
apiRouter.get('/admin/users', 
  authMiddleware,                    // 先认证
  requireRole(['admin']),            // 再检查权限
  async (ctx) => {
    ctx.body = { message: '管理员用户列表' };
  }
);

// 需要管理员或技师权限的路由
apiRouter.get('/maintenance/schedule',
  authMiddleware,
  requireRole(['admin', 'mechanic']),
  async (ctx) => {
    ctx.body = { message: '维修计划列表' };
  }
);

/**
 * 3. 使用自定义错误类
 */

// 安排维保检查 - 使用 scheduleMaintenanceCheck 和 VehicleMaintenanceError
apiRouter.post('/vehicles/:vehicleId/maintenance', 
  authMiddleware,
  scheduleMaintenanceCheck
);

// 也可以在新的控制器中使用自定义错误类
apiRouter.post('/vehicles/:vehicleId/repair', 
  authMiddleware,
  async (ctx) => {
    const { vehicleId } = ctx.params;
    const { description, priority } = ctx.request.body;
    
    try {
      // 模拟业务逻辑
      const vehicle = await findVehicleById(vehicleId);
      if (!vehicle) {
        throw createError.notFound('车辆不存在');
      }
      
      // 检查是否有进行中的维修
      const activeRepairs = await getActiveRepairs(vehicleId);
      if (activeRepairs.length > 0) {
        // 使用导入的自定义错误类
        throw new VehicleMaintenanceError(
          '该车辆已有进行中的维修，无法安排新的维修',
          vehicleId
        );
      }
      
      // 创建维修单
      const repair = await createRepairOrder({
        vehicleId,
        description,
        priority,
        customerId: ctx.state.user.id
      });
      
      ctx.status = 201;
      ctx.body = {
        status: 'success',
        message: '维修单创建成功',
        data: repair
      };
      
    } catch (error) {
      // 错误会被全局错误处理中间件捕获
      throw error;
    }
  }
);

/**
 * 4. 组合使用多个示例中的组件
 */

// 完整的用户管理流程示例
apiRouter.post('/admin/users/:userId/suspend',
  authMiddleware,                    // 认证中间件
  requireRole(['admin']),            // 权限中间件
  async (ctx) => {
    const { userId } = ctx.params;
    const { reason, duration } = ctx.request.body;
    
    try {
      // 使用业务服务层的验证逻辑
      if (!userId || isNaN(userId)) {
        throw createError.validation('无效的用户ID');
      }
      
      if (!reason) {
        throw createError.validation('暂停原因是必填项');
      }
      
      // 检查用户是否存在
      const user = await findUserById(userId);
      if (!user) {
        throw createError.notFound('用户不存在');
      }
      
      // 检查是否尝试暂停管理员账户
      if (user.role === 'admin') {
        throw createError.forbidden('不能暂停管理员账户');
      }
      
      // 暂停用户
      await suspendUser(userId, reason, duration);
      
      ctx.body = {
        status: 'success',
        message: '用户已被暂停',
        data: {
          userId: userId,
          reason: reason,
          duration: duration
        }
      };
      
    } catch (error) {
      throw error;
    }
  }
);

/**
 * 5. 创建包装器函数来复用错误处理逻辑
 */

// 包装器函数，自动处理常见错误
const withErrorHandling = (asyncFn) => {
  return async (ctx, next) => {
    try {
      await asyncFn(ctx, next);
    } catch (error) {
      // 可以在这里添加额外的错误处理逻辑
      // 比如特定的日志记录、指标收集等
      
      // 重新抛出错误，让全局处理器处理
      throw error;
    }
  };
};

// 使用包装器
apiRouter.get('/vehicles', 
  authMiddleware,
  withErrorHandling(async (ctx) => {
    const vehicles = await getUserVehicles(ctx.state.user.id);
    ctx.body = {
      status: 'success',
      data: vehicles
    };
  })
);

/**
 * 6. 集成示例到完整的应用中
 */

// 在 app.js 中的使用示例
function setupErrorHandlingExamples(app) {
  // 注册路由
  app.use(apiRouter.routes());
  app.use(apiRouter.allowedMethods());
  
  // 全局错误处理中间件应该在所有路由之后注册
  // app.use(globalErrorHandler);
}

/**
 * 7. 测试错误处理的辅助函数
 */

// 测试各种错误场景
const testErrorScenarios = {
  // 测试验证错误
  async testValidationError(ctx) {
    throw createError.validation('这是一个验证错误测试');
  },
  
  // 测试认证错误
  async testAuthError(ctx) {
    throw createError.authentication('这是一个认证错误测试');
  },
  
  // 测试权限错误
  async testAuthorizationError(ctx) {
    throw createError.authorization('这是一个权限错误测试');
  },
  
  // 测试业务错误
  async testBusinessError(ctx) {
    throw new VehicleMaintenanceError('这是一个业务错误测试', 'vehicle_123');
  },
  
  // 测试未知错误
  async testUnknownError(ctx) {
    throw new Error('这是一个未知错误测试');
  }
};

// 注册测试路由（仅在开发环境）
if (process.env.NODE_ENV === 'development') {
  Object.entries(testErrorScenarios).forEach(([name, handler]) => {
    apiRouter.get(`/test/errors/${name}`, handler);
  });
}

/**
 * 模拟的辅助函数
 */
async function findVehicleById(id) {
  // 模拟数据库查询
  return { id, make: 'Toyota', model: 'Camry' };
}

async function getActiveRepairs(vehicleId) {
  // 模拟查询进行中的维修
  return [];
}

async function createRepairOrder(data) {
  // 模拟创建维修单
  return { id: 'repair_' + Date.now(), ...data };
}

async function findUserById(id) {
  // 模拟用户查询
  return { id, username: 'testuser', role: 'customer' };
}

async function suspendUser(userId, reason, duration) {
  // 模拟暂停用户
  console.log(`用户 ${userId} 已被暂停，原因: ${reason}`);
}

async function getUserVehicles(userId) {
  // 模拟获取用户车辆
  return [
    { id: 1, make: 'Toyota', model: 'Camry' },
    { id: 2, make: 'Honda', model: 'Civic' }
  ];
}

module.exports = {
  apiRouter,
  setupErrorHandlingExamples,
  testErrorScenarios,
  withErrorHandling
}; 