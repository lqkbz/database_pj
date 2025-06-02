const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('CustomerProfile');

/**
 * 获取当前客户个人资料
 * 
 * @param {Object} ctx - Koa上下文
 */
const getMyProfile = async (ctx) => {
  const { user } = ctx.state;
  
  // 获取用户详细信息（从数据库）
  // 实际项目中替换为数据库查询
  const userDetails = {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: '13800138000',
    fullName: '张三',
    address: '北京市朝阳区XX街XX号',
    createdAt: new Date('2023-01-01'),
    vehicleCount: 2,
    orderCount: 5
  };
  
  ctx.body = {
    status: 'success',
    data: {
      user: userDetails
    }
  };
};

/**
 * 更新当前客户个人资料
 * 
 * @param {Object} ctx - Koa上下文
 */
const updateMyProfile = async (ctx) => {
  const { user } = ctx.state;
  const updateData = ctx.request.body;
  
  // 验证更新数据
  const allowedFields = ['fullName', 'phone', 'address', 'email', 'password'];
  const updates = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = updateData[key];
    }
  });
  
  if (Object.keys(updates).length === 0) {
    throw createError.validation('没有提供有效的更新字段');
  }
  
  // 处理密码更新
  if (updates.password) {
    // 实际项目中应该验证旧密码
    // const bcrypt = require('bcrypt');
    // updates.password = await bcrypt.hash(updates.password, 10);
    logger.info(`用户 ${user.id} 更新了密码`);
  }
  
  // 更新用户信息（在数据库中）
  // 实际项目中替换为数据库更新操作
  
  ctx.body = {
    status: 'success',
    message: '个人资料已更新',
    data: {
      updatedFields: Object.keys(updates)
    }
  };
};

module.exports = {
  getMyProfile,
  updateMyProfile
};