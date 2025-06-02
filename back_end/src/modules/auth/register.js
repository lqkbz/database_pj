const { validateRegistration } = require('../../utils/validator');
const bcrypt = require('bcrypt');
const { createError } = require('../../middleware/errorhandler');

/**
 * 用户注册控制器
 * 
 * 处理用户注册请求，验证用户输入，创建新用户
 * 
 * @param {Object} ctx - Koa上下文
 */
module.exports = async (ctx) => {
  const userData = ctx.request.body;
  
  // 验证用户输入
  const { isValid, errors } = validateRegistration(userData);
  
  if (!isValid) {
    throw createError.validation('输入数据验证失败', errors);
  }
  
  // 检查用户名或邮箱是否已存在
  // 注意：这里需要连接到实际的数据库
  // 以下是模拟代码，实际项目中应替换为数据库操作
  const existingUser = null; // 从数据库中查询
  
  if (existingUser) {
    throw createError.conflict('用户名或邮箱已被注册');
  }
  
  // 加密密码
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);
  
  // 创建新用户
  // 注意：这里需要连接到实际的数据库
  // 以下是模拟代码，实际项目中应替换为数据库操作
  const newUser = {
    id: 'user_' + Date.now(),
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    createdAt: new Date(),
    role: 'user'
  };
  
  // 返回成功响应，不包含敏感信息
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    message: '注册成功',
    data: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  };
};
