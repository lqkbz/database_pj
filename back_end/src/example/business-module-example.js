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
   * 创建新用户的主要业务逻辑
   * @param {Object} userData - 用户数据
   * @returns {Object} 创建的用户对象
   */
  static async createUser(userData) {
    try {
      // 提取用户数据
      const { username, password } = userData;
      
      // 1. 数据验证
      this.validateUserInput({ username, password });
      
      // 2. 业务规则检查
      await this.checkBusinessRules({ username });
      
      // 3. 创建用户
      const user = await this.createUserRecord({
        username,
        password,
        status: 'active',
        createdAt: new Date()
      });
      
      // 4. 返回处理后的用户信息
      return {
        id: user.id,
        username: user.username,
        status: user.status,
        createdAt: user.createdAt
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      
      // 处理意外错误
      throw new BusinessError(
        'USER_CREATION_FAILED',
        '用户创建失败',
        error
      );
    }
  }

  /**
   * 验证用户输入数据
   * @param {Object} data - 输入数据
   */
  static validateUserInput(data) {
    const { username, password } = data;
    
    // 必填字段检查
    if (!username || !password) {
      throw new BusinessError(
        'MISSING_REQUIRED_FIELDS',
        '缺少必要字段：用户名和密码'
      );
    }
    
    // 用户名格式验证
    if (username.length < 3 || username.length > 20) {
      throw new BusinessError(
        'INVALID_USERNAME_FORMAT',
        '用户名长度必须在3-20个字符之间'
      );
    }
    
    // 密码强度验证
    if (password.length < 6) {
      throw new BusinessError(
        'WEAK_PASSWORD',
        '密码长度至少6个字符'
      );
    }
  }

  /**
   * 检查业务规则
   * @param {Object} data - 数据对象
   */
  static async checkBusinessRules(data) {
    const { username } = data;
    
    // 检查用户名唯一性
    const existingUser = await this.findUserByUsername(username);
    if (existingUser) {
      throw new BusinessError(
        'DUPLICATE_USERNAME',
        '用户名已存在',
        {
          field: 'username',
          value: username
        }
      );
    }
    
    // 其他业务规则检查...
  }

  /**
   * 根据用户名查找用户
   * @param {string} username - 用户名
   * @returns {Object|null} 用户对象或null
   */
  static async findUserByUsername(username) {
    // 模拟数据库查询
    return null;
  }

  /**
   * 创建用户记录
   * @param {Object} userData - 用户数据
   * @returns {Object} 创建的用户对象
   */
  static async createUserRecord(userData) {
    // 模拟数据库插入
    return {
      id: Date.now().toString(),
      ...userData
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
    const result = await UserService.createUser(ctx.request.body);
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '注册成功',
      data: result
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