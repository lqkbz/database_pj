/**
 * 业务模块错误处理示例
 * 演示在具体业务逻辑中如何进行错误判断和处理
 */

const { createError } = require('../middleware/errorhandler');
const { createLogger } = require('../middleware/logger');

const logger = createLogger('BusinessModule');

/**
 * 用户注册业务模块
 * 演示：输入验证、业务规则检查、数据库错误处理
 */
class UserService {
  
  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Object} 注册结果
   */
  static async register(userData) {
    const { username, email, password, phone } = userData;
    
    // 1. 输入验证错误处理
    this.validateUserInput({ username, email, password, phone });
    
    // 2. 业务规则检查
    await this.checkBusinessRules({ username, email, phone });
    
    // 3. 数据库操作错误处理
    try {
      // 模拟数据库操作
      const user = await this.createUserInDatabase(userData);
      
      logger.info(`用户注册成功: ${username}`);
      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };
      
    } catch (error) {
      // 数据库相关错误处理
      if (error.code === '23505') { // PostgreSQL唯一约束错误
        throw createError.conflict('用户名或邮箱已存在');
      }
      
      if (error.code === 'ECONNREFUSED') {
        logger.error('数据库连接失败', error);
        throw createError.internal('服务暂时不可用，请稍后重试');
      }
      
      // 其他未知数据库错误
      logger.error('数据库操作失败', error);
      throw createError.internal('注册失败，请联系技术支持');
    }
  }
  
  /**
   * 输入验证
   * @param {Object} data - 要验证的数据
   */
  static validateUserInput(data) {
    const { username, email, password, phone } = data;
    
    // 必填字段检查
    if (!username || !email || !password) {
      throw createError.validation('用户名、邮箱和密码都是必填项');
    }
    
    // 用户名格式检查
    if (username.length < 3 || username.length > 20) {
      throw createError.validation('用户名长度必须在3-20个字符之间', {
        field: 'username',
        minLength: 3,
        maxLength: 20,
        currentLength: username.length
      });
    }
    
    // 用户名字符检查
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      throw createError.validation('用户名只能包含字母、数字、下划线和连字符');
    }
    
    // 邮箱格式检查
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError.validation('邮箱格式不正确');
    }
    
    // 密码强度检查
    if (password.length < 8) {
      throw createError.validation('密码长度至少8位');
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      throw createError.validation('密码必须包含大小写字母和数字');
    }
    
    // 手机号格式检查（可选）
    if (phone) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        throw createError.validation('手机号格式不正确');
      }
    }
  }
  
  /**
   * 业务规则检查
   * @param {Object} data - 要检查的数据
   */
  static async checkBusinessRules(data) {
    const { username, email, phone } = data;
    
    // 检查用户名是否已存在
    const existingUser = await this.findUserByUsername(username);
    if (existingUser) {
      throw createError.conflict('用户名已被注册', {
        field: 'username',
        value: username
      });
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await this.findUserByEmail(email);
    if (existingEmail) {
      throw createError.conflict('邮箱已被注册', {
        field: 'email',
        value: email
      });
    }
    
    // 检查手机号是否已存在（如果提供）
    if (phone) {
      const existingPhone = await this.findUserByPhone(phone);
      if (existingPhone) {
        throw createError.conflict('手机号已被注册', {
          field: 'phone',
          value: phone
        });
      }
    }
    
    // 检查是否在黑名单中
    const isBlacklisted = await this.checkBlacklist(email);
    if (isBlacklisted) {
      throw createError.forbidden('该邮箱已被列入黑名单');
    }
    
    // 检查注册频率限制
    const registrationCount = await this.getRegistrationCountByIP();
    if (registrationCount > 5) {
      throw createError.rateLimit('注册过于频繁，请稍后再试');
    }
  }
  
  /**
   * 模拟数据库查询方法
   */
  static async findUserByUsername(username) {
    // 模拟数据库查询
    return null; // 假设不存在
  }
  
  static async findUserByEmail(email) {
    // 模拟数据库查询
    return null; // 假设不存在
  }
  
  static async findUserByPhone(phone) {
    // 模拟数据库查询
    return null; // 假设不存在
  }
  
  static async checkBlacklist(email) {
    // 模拟黑名单检查
    return false;
  }
  
  static async getRegistrationCountByIP() {
    // 模拟IP注册频率检查
    return 0;
  }
  
  static async createUserInDatabase(userData) {
    // 模拟数据库操作
    return {
      id: 'user_' + Date.now(),
      username: userData.username,
      email: userData.email,
      createdAt: new Date()
    };
  }
}

/**
 * 车辆管理业务模块
 * 演示：权限检查、状态验证、业务逻辑错误处理
 */
class VehicleService {
  
  /**
   * 添加车辆
   * @param {Object} vehicleData - 车辆数据
   * @param {Object} currentUser - 当前用户
   */
  static async addVehicle(vehicleData, currentUser) {
    const { make, model, year, licensePlate, vin } = vehicleData;
    
    // 1. 权限检查
    if (!currentUser) {
      throw createError.authentication('请先登录');
    }
    
    if (currentUser.role !== 'customer' && currentUser.role !== 'admin') {
      throw createError.authorization('只有客户可以添加车辆');
    }
    
    // 2. 输入验证
    this.validateVehicleData(vehicleData);
    
    // 3. 业务规则检查
    await this.checkVehicleBusinessRules(vehicleData, currentUser);
    
    // 4. 创建车辆记录
    try {
      const vehicle = await this.createVehicleInDatabase(vehicleData, currentUser.id);
      
      logger.info(`用户 ${currentUser.id} 添加了车辆: ${make} ${model}`);
      return {
        success: true,
        data: vehicle
      };
      
    } catch (error) {
      logger.error('添加车辆失败', error);
      throw createError.internal('添加车辆失败');
    }
  }
  
  /**
   * 车辆数据验证
   */
  static validateVehicleData(data) {
    const { make, model, year, licensePlate, vin } = data;
    
    if (!make || !model || !year || !licensePlate || !vin) {
      throw createError.validation('车辆品牌、型号、年份、车牌号和VIN码都是必填项');
    }
    
    // 年份检查
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
      throw createError.validation(`车辆年份必须在1900-${currentYear + 1}之间`);
    }
    
    // 车牌号格式检查
    const licensePlateRegex = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5}$/;
    if (!licensePlateRegex.test(licensePlate)) {
      throw createError.validation('车牌号格式不正确');
    }
    
    // VIN码检查
    if (vin.length !== 17) {
      throw createError.validation('VIN码必须为17位');
    }
  }
  
  /**
   * 车辆业务规则检查
   */
  static async checkVehicleBusinessRules(data, currentUser) {
    const { licensePlate, vin } = data;
    
    // 检查车牌号是否已存在
    const existingPlate = await this.findVehicleByLicensePlate(licensePlate);
    if (existingPlate) {
      throw createError.conflict('该车牌号已被注册');
    }
    
    // 检查VIN码是否已存在
    const existingVin = await this.findVehicleByVin(vin);
    if (existingVin) {
      throw createError.conflict('该VIN码已被注册');
    }
    
    // 检查用户车辆数量限制
    const userVehicleCount = await this.getUserVehicleCount(currentUser.id);
    const maxVehicles = currentUser.role === 'customer' ? 10 : 100;
    
    if (userVehicleCount >= maxVehicles) {
      throw createError.forbidden(`每个用户最多只能注册${maxVehicles}辆车`);
    }
  }
  
  // 模拟数据库方法
  static async findVehicleByLicensePlate(licensePlate) {
    return null;
  }
  
  static async findVehicleByVin(vin) {
    return null;
  }
  
  static async getUserVehicleCount(userId) {
    return 0;
  }
  
  static async createVehicleInDatabase(vehicleData, userId) {
    return {
      id: 'vehicle_' + Date.now(),
      ...vehicleData,
      userId,
      createdAt: new Date()
    };
  }
}

/**
 * 控制器层 - 使用业务服务
 */
const userController = {
  /**
   * 用户注册控制器
   */
  async register(ctx) {
    // 直接调用业务服务，错误会被全局中间件捕获
    const result = await UserService.register(ctx.request.body);
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '注册成功',
      data: result.data
    };
  },
  
  /**
   * 添加车辆控制器
   */
  async addVehicle(ctx) {
    const result = await VehicleService.addVehicle(
      ctx.request.body,
      ctx.state.user
    );
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '车辆添加成功',
      data: result.data
    };
  }
};

module.exports = {
  UserService,
  VehicleService,
  userController
}; 