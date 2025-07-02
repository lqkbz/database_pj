/**
 * 数据库配置文件 - Sequelize配置
 * 
 * 环境变量说明：
 * - NODE_ENV: 运行环境 (development/production/test/staging)
 * - DB_HOST: 数据库主机地址
 * - DB_PORT: 数据库端口
 * - DB_USER: 数据库用户名
 * - DB_PASSWORD: 数据库密码
 * - DB_NAME: 数据库名称
 * - DB_POOL_MIN: 连接池最小连接数
 * - DB_POOL_MAX: 连接池最大连接数
 */

// 加载环境变量（如果还没有加载）
require('dotenv').config();

/**
 * 环境变量工作原理解释：
 * 
 * 当你写 username: process.env.DB_USER 时，发生了什么：
 * 
 * 1. dotenv 库读取 .env 文件
 * 2. 解析 DB_USER=root 这样的行
 * 3. 将 DB_USER 设置到 process.env 对象中
 * 4. process.env.DB_USER 返回字符串 "root"
 * 
 * 文件发现机制：
 * - dotenv 默认查找项目根目录下的 .env 文件
 * - 文件名必须是 ".env"（不是通过扩展名识别）
 * - 可以通过 path 参数指定其他文件路径
 */

const config = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vehicle_repair_system_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      acquire: 30000,
      idle: 10000
    },
    timezone: '+08:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  },
  
  test: {
    username: process.env.TEST_DB_USER || process.env.DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.TEST_DB_NAME || 'vehicle_repair_system_test',
    host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false, // 测试环境关闭日志
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+08:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  },
  
  staging: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'vehicle_repair_system_staging',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '15', 10),
      min: parseInt(process.env.DB_POOL_MIN || '3', 10),
      acquire: 30000,
      idle: 10000
    },
    timezone: '+08:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  },
  
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      acquire: 30000,
      idle: 10000
    },
    timezone: '+08:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    // 生产环境额外配置
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};

// 获取当前环境，默认为 development
const env = process.env.NODE_ENV || 'development';

// 验证环境是否有效
const validEnvironments = ['development', 'test', 'staging', 'production'];
if (!validEnvironments.includes(env)) {
  console.warn(`警告: 无效的环境 "${env}"，将使用默认环境 "development"`);
  module.exports = config.development;
} else {
  console.log(`当前数据库环境: ${env}`);
  
  // 验证生产环境必需的环境变量
  if (env === 'production') {
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`❌ 生产环境缺少必需的环境变量: ${missingVars.join(', ')}`);
      process.exit(1);
    }
  }
  
  module.exports = config[env];
}

// 同时导出所有配置供其他用途
module.exports.config = config;
module.exports.currentEnv = env;

