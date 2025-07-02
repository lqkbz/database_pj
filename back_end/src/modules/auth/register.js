/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 创建新用户账号
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - password
 *               - confirmPassword
 *             properties:
 *               name:
 *                 type: string
 *                 description: 用户姓名
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 密码
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: 确认密码
 *               role:
 *                 type: string
 *                 enum: [customer, mechanic, admin]
 *                 description: 用户角色（可选，默认为customer）
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 注册成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 用户ID
 *                     name:
 *                       type: string
 *                       description: 用户姓名
 *                     role:
 *                       type: string
 *                       description: 用户角色
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 用户名已被注册
 *       500:
 *         description: 服务器错误
 */
const { validateRegistration } = require('../../utils/validator');
const { User, MechanicProfile } = require('../../models');
const bcrypt = require('bcrypt');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('Auth');

/**
 * 用户注册控制器
 * 
 * 处理用户注册请求，验证用户输入，创建新用户
 * 如果用户角色为技师，同时创建技师档案
 * 
 * @param {Object} ctx - Koa上下文
 */
const register = async (ctx) => {
  try {
    const userData = ctx.request.body;
    console.log(userData);
    // 添加调试日志
    logger.info('注册请求详情:', {
      method: ctx.method,
      path: ctx.path,
      query: ctx.query,
      body: userData,
      headers: ctx.headers
    });
    
    // 验证用户输入
    const { isValid, errors } = validateRegistration(userData);
    logger.info('验证结果:', { isValid, errors });
    if (!isValid) {
      throw createError.validation('输入数据验证失败', errors);
    }
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({
      where: { name: userData.name },
      attributes: ['user_id']
    });
    
    if (existingUser) {
      // 🔍 调试：检查createError.conflict创建的错误对象
      console.log('=== 用户名重复错误 ===');
      console.log('发现重复用户，创建冲突错误...');
      
      const conflictError = createError.conflict('用户名已被注册');
      console.log('冲突错误对象属性:');
      console.log('- 类型:', conflictError.constructor.name);
      console.log('- 消息:', conflictError.message);
      console.log('- statusCode:', conflictError.statusCode);
      console.log('- code:', conflictError.code);
      console.log('- isOperational:', conflictError.isOperational);
      console.log('准备抛出错误...');
      
      throw conflictError;
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // 获取sequelize实例以创建事务
    const sequelize = User.sequelize;
    const transaction = await sequelize.transaction();
    
    try {
      // 创建新用户
      const newUser = await User.create({
        name: userData.name,
        password_hash: hashedPassword,
        role: userData.role || 'customer'
      }, { transaction });
      
      // 如果用户角色是技师，创建对应的技师档案
      if (newUser.role === 'mechanic') {
        await MechanicProfile.create({
          mechanic_id: newUser.user_id
          // 其他字段暂时为空，后续可以通过个人资料页面完善
        }, { transaction });
        
        logger.info(`为技师用户 ${userData.name} 创建了技师档案`);
      }
      
      // 提交事务
      await transaction.commit();
      
      logger.info(`新用户注册成功: ${userData.name} (${newUser.role})`);
      
      // 返回成功响应，不包含敏感信息
      ctx.status = 201;
      ctx.body = {
        status: 'success',
        message: '注册成功',
        data: {
          id: newUser.user_id,
          name: newUser.name,
          role: newUser.role,
          createdAt: newUser.created_at,
          ...(newUser.role === 'mechanic' && { hasMechanicProfile: true })
        }
      };
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`用户注册失败: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      isOperational: error.isOperational,
      statusCode: error.statusCode
    });
    
    console.log('=== register 捕获错误 ===');
    console.log('错误消息:', error.message);
    console.log('错误类型:', error.constructor.name);
    console.log('准备重新抛出错误...');
    
    // 如果是自定义错误（AppError），直接抛出
    if (error.isOperational && error.statusCode) {
      throw error;
    }
    
    // 处理数据库连接错误
    if (
      error.name === 'SequelizeConnectionError' ||
      error.name === 'SequelizeConnectionRefusedError' ||
      error.name === 'SequelizeAccessDeniedError'
    ) {
      logger.error('数据库连接错误:', error);
      throw createError.internal('数据库连接失败，请检查数据库配置');
    }
    
    // 处理其他Sequelize错误
    if (error.name && error.name.includes('Sequelize')) {
      logger.error('Sequelize错误:', error);
      throw createError.internal(`数据库操作失败: ${error.message}`);
    }
    
    // 其他未知错误
    logger.error('未知错误:', error);
    throw createError.internal('注册过程中发生错误');
  }
};

module.exports = {
  register
};
