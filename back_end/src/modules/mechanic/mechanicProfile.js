const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('MechanicProfile');

/**
 * 获取当前技师个人资料
 * 
 * @param {Object} ctx - Koa上下文
 */
const getMyProfile = async (ctx) => {
  const { user } = ctx.state;
  
  // 获取技师详细信息（从数据库）
  // 实际项目中替换为数据库查询
  const mechanicProfile = {
    id: user.id,
    name: '李师傅',
    phone: '13911112222',
    email: user.email,
    specialties: ['发动机维修', '电子系统诊断', '底盘调校'],
    qualification: '高级汽车维修技师',
    certification: ['ASE认证', '本田认证技师'],
    experience: 8,  // 工作年限
    joinDate: '2020-03-15',
    avatar: 'https://example.com/avatars/mechanic1.jpg',
    rating: 4.8,
    completedOrders: 356,
    status: 'active',
    workingHours: {
      monday: { start: '08:00', end: '17:00' },
      tuesday: { start: '08:00', end: '17:00' },
      wednesday: { start: '08:00', end: '17:00' },
      thursday: { start: '08:00', end: '17:00' },
      friday: { start: '08:00', end: '17:00' },
      saturday: { start: '09:00', end: '15:00' },
      sunday: { start: null, end: null }
    }
  };
  
  ctx.body = {
    status: 'success',
    data: {
      profile: mechanicProfile
    }
  };
};

/**
 * 更新当前技师个人资料
 * 
 * @param {Object} ctx - Koa上下文
 */
const updateMyProfile = async (ctx) => {
  const { user } = ctx.state;
  const updateData = ctx.request.body;
  
  // 验证更新数据
  const allowedFields = ['phone', 'specialties', 'qualification', 'certification', 'workingHours', 'email', 'password'];
  const updates = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = updateData[key];
    }
  });
  
  if (Object.keys(updates).length === 0) {
    throw createError.validation('没有提供有效的更新字段');
  }
  
  // 验证工作时间格式
  if (updates.workingHours) {
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of Object.keys(updates.workingHours)) {
      if (!daysOfWeek.includes(day)) {
        throw createError.validation(`无效的工作日: ${day}`);
      }
      
      const hours = updates.workingHours[day];
      if (hours.start && hours.end) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(hours.start) || !timeRegex.test(hours.end)) {
          throw createError.validation(`工作时间格式无效，应为HH:MM格式，例如 09:00`);
        }
      }
    }
  }
  
  // 处理密码更新
  if (updates.password) {
    // 实际项目中应该验证旧密码并加密新密码
    // const bcrypt = require('bcrypt');
    // updates.password = await bcrypt.hash(updates.password, 10);
    logger.info(`技师 ${user.id} 更新了密码`);
  }
  
  // 更新技师信息（在数据库中）
  // 实际项目中替换为数据库更新操作
  
  logger.info(`技师 ${user.id} 更新了个人资料`);
  
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
