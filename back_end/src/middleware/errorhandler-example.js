/**
 * 错误处理中间件使用示例
 * 
 * 展示如何在业务代码中使用错误处理功能
 */

const { createError, AppError, ErrorTypes } = require('./errorhandler');

/**
 * 在控制器中使用错误处理的示例
 */

// 示例1: 用户注册控制器
const registerUser = async (ctx) => {
  try {
    const { username, email, password } = ctx.request.body;
    
    // 数据验证
    if ( !password) {
      throw createError.validation('用户名、邮箱和密码都是必填项');
    }
    
    if (password.length < 8) {
      throw createError.validation('密码长度至少8位', {
        field: 'password',
        minLength: 8
      });
    }
    
    // 检查用户是否已存在
    
    // 创建用户
    const user = await User.create({ username, email, password });
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '注册成功',
      data: { userId: user.id }
    };
    
  } catch (error) {
    // 错误会被全局错误处理中间件捕获
    throw error;
  }
};

// 示例2: 用户登录控制器
const loginUser = async (ctx) => {
  const {  password } = ctx.request.body;
  
  // 查找用户
  // 检查账户状态
  // 验证密码
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) 
    throw createError.authentication('密码错误');
  
  // 生成JWT令牌
  const token = generateToken(user);
  
  ctx.body = {
    status: 'success',
    message: '登录成功',
    data: { token, user: { id: user.id, username: user.username } }
  };
};

// 示例3: 获取用户资料控制器
const getUserProfile = async (ctx) => {
  const userId = ctx.params.id;
  
  // 检查用户ID格式
  if (!userId || isNaN(userId)) {
    throw createError.validation('无效的用户ID');
  }
  
  // 查找用户
  const user = await User.findById(userId);
  if (!user) {
    throw createError.notFound('用户不存在');
  }
  
  // 权限检查：只能查看自己的资料或管理员可以查看所有
  const currentUser = ctx.state.user;
  if (currentUser.id !== parseInt(userId) && currentUser.role !== 'admin') {
    throw createError.authorization('无权访问该用户资料');
  }
  
  ctx.body = {
    status: 'success',
    data: { user }
  };
};

// 示例4: 文件上传控制器
const uploadAvatar = async (ctx) => {
  try {
    const file = ctx.request.files?.avatar;
    
    if (!file) {
      throw createError.validation('请选择要上传的头像文件');
    }
    
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw createError.validation('只支持 JPEG、PNG、GIF 格式的图片');
    }
    
    // 检查文件大小（2MB）
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw createError.validation('文件大小不能超过 2MB');
    }
    
    // 保存文件
    const avatarPath = await saveFile(file);
    
    // 更新用户头像
    await User.update(ctx.state.user.id, { avatar: avatarPath });
    
    ctx.body = {
      status: 'success',
      message: '头像上传成功',
      data: { avatarPath }
    };
    
  } catch (error) {
    // 清理临时文件
    if (ctx.request.files?.avatar) {
      await cleanupTempFile(ctx.request.files.avatar.path);
    }
    throw error;
  }
};

// 示例5: 数据库操作错误处理
const createWorkOrder = async (ctx) => {
  const { vehicleId, description } = ctx.request.body;
  
  try {
    // 检查车辆是否存在
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw createError.notFound('车辆不存在');
    }
    
    // 检查车辆是否属于当前用户
    if (vehicle.userId !== ctx.state.user.id) {
      throw createError.authorization('无权为该车辆创建工单');
    }
    
    // 创建工单
    const workOrder = await WorkOrder.create({
      vehicleId,
      customerId: ctx.state.user.id,
      description
    });
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '工单创建成功',
      data: { workOrder }
    };
    
  } catch (error) {
    // 数据库错误会被自动处理
    // 如重复键、外键约束等
    throw error;
  }
};

/**
 * 中间件中的错误处理示例
 */

// 认证中间件
const authMiddleware = async (ctx, next) => {
  const token = ctx.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw createError.authentication('缺少认证令牌');
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ctx.state.user = decoded;
    await next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createError.authentication('令牌已过期');
    } else if (error.name === 'JsonWebTokenError') {
      throw createError.authentication('无效的令牌');
    }
    throw error;
  }
};

// 权限检查中间件
const requireRole = (roles) => {
  return async (ctx, next) => {
    const user = ctx.state.user;
    
    if (!user) {
      throw createError.authentication('请先登录');
    }
    
    if (!roles.includes(user.role)) {
      throw createError.authorization(`需要 ${roles.join(' 或 ')} 权限`);
    }
    
    await next();
  };
};

/**
 * 自定义错误类的使用示例
 */

// 定义业务特定的错误类型
const BusinessErrorTypes = {
  VEHICLE_MAINTENANCE_ERROR: { code: 'VEHICLE_MAINTENANCE_ERROR', status: 400 },
  INVENTORY_ERROR: { code: 'INVENTORY_ERROR', status: 400 },
  PAYMENT_PROCESSING_ERROR: { code: 'PAYMENT_PROCESSING_ERROR', status: 400 }
};

// 业务特定的错误类
class VehicleMaintenanceError extends AppError {
  constructor(message, vehicleId) {
    super(message, BusinessErrorTypes.VEHICLE_MAINTENANCE_ERROR);
    this.vehicleId = vehicleId;
  }
}

// 使用自定义错误
const scheduleMaintenanceCheck = async (ctx) => {
  const { vehicleId } = ctx.params;
  
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw createError.notFound('车辆不存在');
  }
  
  // 检查是否有进行中的维修
  const activeOrders = await WorkOrder.findByVehicleId(vehicleId, 'in_progress');
  if (activeOrders.length > 0) {
    throw new VehicleMaintenanceError(
      '该车辆正在维修中，无法安排新的保养',
      vehicleId
    );
  }
  
  // 继续处理...
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  uploadAvatar,
  createWorkOrder,
  authMiddleware,
  requireRole,
  scheduleMaintenanceCheck,
  VehicleMaintenanceError
}; 