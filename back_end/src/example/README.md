# 错误处理示例使用指南

## 概述

这个目录包含了完整的错误处理示例，演示了在Koa.js应用中如何正确实现错误处理机制。

## 🎯 核心原则

### 推荐的错误处理模式
```
全局错误处理中间件 + 业务层错误判断
```

### 为什么不推荐分散错误处理？
- ❌ 错误格式不统一
- ❌ 代码重复，维护困难
- ❌ 难以进行统一监控
- ❌ 响应格式不一致

### 推荐模式的优势
- ✅ 错误处理逻辑集中
- ✅ 统一的错误响应格式
- ✅ 更好的错误日志记录
- ✅ 易于维护和扩展

## 📁 文件说明

### 1. `error-handling-patterns.md`
错误处理模式的理论说明和对比

### 2. `business-module-example.js`
**业务模块错误处理示例**
- 展示在业务逻辑中如何进行错误判断
- 演示输入验证、业务规则检查、数据库错误处理
- 包含用户注册和车辆管理两个完整示例

```javascript
// 使用示例
const { UserService, VehicleService } = require('./business-module-example');

// 在控制器中使用
async function registerController(ctx) {
  // 直接调用业务服务，错误会被全局中间件捕获
  const result = await UserService.register(ctx.request.body);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    data: result.data
  };
}
```

### 3. `middleware-error-example.js`
**中间件错误处理示例**
- 认证中间件：Token验证、用户状态检查
- 权限检查中间件：角色权限验证
- 频率限制中间件：Rate Limiting
- 输入验证中间件：请求体验证
- 文件上传中间件：文件处理错误

```javascript
// 使用示例
const { authMiddleware, requireRole, rateLimitMiddleware } = require('./middleware-error-example');

// 在路由中使用
router.get('/admin/users',
  authMiddleware,                    // 先认证
  requireRole(['admin']),            // 再检查权限
  rateLimitMiddleware({ maxRequests: 100 }), // 频率限制
  async (ctx) => {
    // 处理业务逻辑
  }
);
```

### 4. `using-errorhandler-example.js`
**errorhandler-example.js 模块使用示例**
演示如何使用 `../middleware/errorhandler-example.js` 导出的所有模块

```javascript
// 1. 直接使用导出的控制器
const { registerUser, loginUser, getUserProfile } = require('../middleware/errorhandler-example');

router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

// 2. 使用导出的中间件
const { authMiddleware, requireRole } = require('../middleware/errorhandler-example');

router.get('/admin', authMiddleware, requireRole(['admin']), handler);

// 3. 使用自定义错误类
const { VehicleMaintenanceError } = require('../middleware/errorhandler-example');

throw new VehicleMaintenanceError('车辆维修中', vehicleId);
```

### 5. `custom-business-errors.js`
**自定义业务错误类型示例**
- 定义业务特定的错误类型常量
- 创建车辆、工单、支付相关的错误类
- 提供错误工厂函数简化使用
- 演示在业务服务中的实际应用

```javascript
// 使用示例
const { createVehicleError, createWorkOrderError } = require('./custom-business-errors');

// 在业务逻辑中使用
if (vehicle.ownerId !== currentUserId) {
  throw createVehicleError.notOwned(vehicleId, currentUserId, vehicle.ownerId);
}

if (workOrder.status === 'completed') {
  throw createWorkOrderError.completed(workOrderId, workOrder.completedAt);
}
```

### 6. `complete-integration-example.js`
**完整集成示例**
展示如何在完整的Koa应用中综合使用所有错误处理组件

## 🚀 快速开始

### 1. 查看基本概念
```bash
# 先阅读错误处理模式说明
cat error-handling-patterns.md
```

### 2. 学习业务层错误处理
```javascript
// 查看业务模块示例
const { UserService } = require('./business-module-example');

// 在你的控制器中使用
router.post('/register', async (ctx) => {
  const result = await UserService.register(ctx.request.body);
  ctx.body = { status: 'success', data: result.data };
});
```

### 3. 使用中间件
```javascript
// 导入中间件
const { authMiddleware, requireRole } = require('./middleware-error-example');

// 应用到路由
router.get('/protected', authMiddleware, requireRole(['user']), handler);
```

### 4. 集成到应用
```javascript
// 参考完整集成示例
const { setupErrorHandling } = require('./complete-integration-example');

const app = new Koa();
setupErrorHandling(app); // 设置全局错误处理
```

## 📋 最佳实践

### 业务层 (Service Layer)
```javascript
// ✅ 好的做法
class UserService {
  static async register(userData) {
    // 1. 输入验证
    if (!userData.email) {
      throw createError.validation('邮箱是必填项');
    }
    
    // 2. 业务规则检查
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw createError.conflict('邮箱已被注册');
    }
    
    // 3. 执行业务逻辑
    return await this.createUser(userData);
  }
}

// ❌ 不好的做法 - 在业务层处理HTTP响应
class UserService {
  static async register(userData, ctx) {
    if (!userData.email) {
      ctx.status = 400;
      ctx.body = { error: '邮箱是必填项' };
      return;
    }
    // ...
  }
}
```

### 中间件层 (Middleware Layer)
```javascript
// ✅ 好的做法
const authMiddleware = async (ctx, next) => {
  const token = ctx.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw createError.authentication('缺少认证令牌');
  }
  
  try {
    const user = jwt.verify(token, SECRET);
    ctx.state.user = user;
    await next();
  } catch (error) {
    throw createError.authentication('无效的令牌');
  }
};

// ❌ 不好的做法 - 在中间件中处理错误响应
const authMiddleware = async (ctx, next) => {
  const token = ctx.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    ctx.status = 401;
    ctx.body = { error: '缺少认证令牌' };
    return;
  }
  // ...
};
```

### 控制器层 (Controller Layer)
```javascript
// ✅ 好的做法
async function createUser(ctx) {
  // 只处理成功情况，错误让全局处理器处理
  const result = await UserService.register(ctx.request.body);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    message: '注册成功',
    data: result
  };
}

// ❌ 不好的做法 - 在控制器中捕获和处理错误
async function createUser(ctx) {
  try {
    const result = await UserService.register(ctx.request.body);
    ctx.status = 201;
    ctx.body = { status: 'success', data: result };
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      ctx.status = 400;
      ctx.body = { error: error.message };
    } else {
      ctx.status = 500;
      ctx.body = { error: '注册失败' };
    }
  }
}
```

## 🛠️ 实际应用

### 在现有项目中集成

1. **设置全局错误处理**
```javascript
// app.js
const { errorHandler } = require('./middleware/errorhandler');

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    await errorHandler(error, ctx);
  }
});
```

2. **重构业务逻辑**
```javascript
// 将现有的错误处理逻辑改为抛出标准化错误
throw createError.validation('输入数据无效');
throw createError.authentication('认证失败');
throw createError.authorization('权限不足');
```

3. **创建自定义错误类型**
```javascript
// 为特定业务场景创建错误类
class VehicleError extends AppError {
  constructor(message, errorType, vehicleId) {
    super(message, errorType);
    this.vehicleId = vehicleId;
  }
}
```

## 🔧 调试和测试

### 开发环境测试
```javascript
// 在开发环境中可以使用测试路由
if (process.env.NODE_ENV === 'development') {
  router.get('/test/errors/:type', async (ctx) => {
    const { type } = ctx.params;
    
    switch (type) {
      case 'validation':
        throw createError.validation('测试验证错误');
      case 'authentication':
        throw createError.authentication('测试认证错误');
      // ...
    }
  });
}
```

### 错误监控
```javascript
// 在全局错误处理器中添加监控
const errorHandler = async (error, ctx) => {
  // 记录错误日志
  logger.error('API错误', {
    error: error.message,
    stack: error.stack,
    path: ctx.path,
    method: ctx.method,
    ip: ctx.ip
  });
  
  // 发送到监控系统
  if (process.env.NODE_ENV === 'production') {
    await sendToMonitoring(error, ctx);
  }
  
  // 响应客户端
  // ...
};
```

## 📞 支持

如果在使用过程中遇到问题，请：

1. 查看相关示例文件
2. 检查错误处理的最佳实践
3. 确认错误是否正确抛出
4. 验证全局错误处理器是否正确配置

## 📚 相关文档

- [Koa.js 官方文档](https://koajs.com/)
- [HTTP 状态码参考](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status)
- [Node.js 错误处理最佳实践](https://nodejs.org/en/docs/guides/error-handling/) 