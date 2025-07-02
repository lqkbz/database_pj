/**
 * 模型索引文件 - Models Index
 * 
 * 统一导出所有数据模型，初始化Sequelize连接并设置模型关联
 */

const { Sequelize } = require('sequelize');
const config = require('../config/database');

// 创建Sequelize实例
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
  pool: config.pool,
  timezone: '+08:00'
});

// 导入所有模型
const User = require('./User')(sequelize);
const Vehicle = require('./Vehicle')(sequelize);
const MechanicProfile = require('./MechanicProfile')(sequelize);
const Part = require('./Part')(sequelize);
const InventoryTxn = require('./InventoryTxn')(sequelize);
const WorkOrder = require('./RepairOrder')(sequelize); // RepairOrder文件现在导出WorkOrder模型
const WorkOrderMechanic = require('./WorkOrderMechanic')(sequelize);
const WorkOrderMaterial = require('./WorkOrderMaterial')(sequelize);
const Payment = require('./Payment')(sequelize);
const Feedback = require('./Feedback')(sequelize);

// 设置模型关联关系
const models = {
  User,
  Vehicle,
  MechanicProfile,
  Part,
  InventoryTxn,
  WorkOrder,
  WorkOrderMechanic,
  WorkOrderMaterial,
  Payment,
  Feedback
};

// 执行所有模型的关联设置
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// 导出数据库实例和所有模型
module.exports = {
  sequelize,
  Sequelize,
  ...models
};

/**
 * 数据库表创建顺序（考虑外键依赖）：
 * 
 * 1. users (基础用户表)
 * 2. vehicles (依赖 users)
 * 3. mechanic_profiles (依赖 users)
 * 4. parts (独立表)
 * 5. work_orders (依赖 users, vehicles)
 * 6. work_order_mechanics (依赖 work_orders, mechanic_profiles)
 * 7. work_order_materials (依赖 work_orders, parts)
 * 8. inventory_txns (依赖 parts, work_orders, users)
 * 9. payments (依赖 work_orders)
 * 10. feedbacks (依赖 work_orders, users)
 */

/**
 * 数据库初始化方法
 */
const initDatabase = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步所有模型到数据库
    await sequelize.sync({ force: false }); // 设置force: true会删除所有表重新创建
    console.log('数据库表结构同步完成');

  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

module.exports.initDatabase = initDatabase; 