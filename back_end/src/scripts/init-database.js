/**
 * 数据库初始化脚本
 * 
 * 功能：
 * - 创建数据库表结构
 * - 插入初始数据
 * - 验证数据完整性
 */

require('dotenv').config();
const { initDatabase, sequelize, User, Vehicle, MechanicProfile, Part } = require('../models');

/**
 * 强制删除所有表
 */
async function dropAllTables() {
  try {
    console.log('🗑️  正在删除所有数据库表...');
    
    // 禁用外键检查
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // 获取所有表名
    const tables = await sequelize.getQueryInterface().showAllTables();
    
    // 删除所有表
    for (const table of tables) {
      console.log(`   删除表: ${table}`);
      await sequelize.getQueryInterface().dropTable(table);
    }
    
    // 重新启用外键检查
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('✅ 所有表删除完成');
  } catch (error) {
    console.error('❌ 删除表失败:', error.message);
    throw error;
  }
}

/**
 * 创建初始管理员用户
 */
async function createInitialAdmin() {
  try {
    // 检查是否已存在管理员
    const existingAdmin = await User.findOne({
      where: { role: 'admin' }
    });
    
    if (existingAdmin) {
      console.log('✅ 管理员用户已存在');
      return existingAdmin;
    }
    
    // 创建管理员用户
    const admin = await User.createUser({
      role: 'admin',
      name: '系统管理员',
      password: 'admin123456' // 生产环境请修改此密码
    });
    
    console.log('✅ 创建管理员用户成功:', admin.name);
    return admin;
  } catch (error) {
    console.error('❌ 创建管理员用户失败:', error.message);
    throw error;
  }
}

/**
 * 创建示例数据
 */
async function createSampleData() {
  try {
    // 创建示例客户
    const customer = await User.createUser({
      role: 'customer',
      name: '张三',
      password: 'customer123'
    });
    
    // 创建示例技师
    const mechanic = await User.createUser({
      role: 'mechanic',
      name: '李师傅',
      password: 'mechanic123'
    });
    
    // 注意：由于现在注册时会自动创建MechanicProfile，我们不需要手动创建
    // 但我们可以更新技师档案信息
    await MechanicProfile.update({
      trade: 'engine',
      hourly_rate: 80.00,
      hire_date: new Date(),
      cert_no: 'CERT001'
    }, {
      where: { mechanic_id: mechanic.user_id }
    });
    
    // 创建示例车辆
    await Vehicle.create({
      owner_id: customer.user_id,
      license_plate: '京A12345',
      vin: 'WVWZZZ1JZ2W386752',
      make: '大众',
      model: '帕萨特',
      year: 2020
    });
    
    // 创建示例配件
    const parts = [
      { name: '机油', price: 45.00, stock_quantity: 100 },
      { name: '机油滤芯', price: 25.00, stock_quantity: 50 },
      { name: '空气滤芯', price: 35.00, stock_quantity: 30 },
      { name: '刹车片', price: 180.00, stock_quantity: 20 }
    ];
    
    for (const partData of parts) {
      await Part.create(partData);
    }
    
    console.log('✅ 示例数据创建成功');
    console.log('👤 示例账号:');
    console.log('   管理员: 系统管理员 / admin123456');
    console.log('   客户: 张三 / customer123');
    console.log('   技师: 李师傅 / mechanic123');
    
  } catch (error) {
    console.error('❌ 创建示例数据失败:', error.message);
    throw error;
  }
}

/**
 * 验证数据库结构
 */
async function validateDatabase() {
  try {
    // 验证表是否存在
    const tables = await sequelize.getQueryInterface().showAllTables();
    const expectedTables = [
      'users', 
      'vehicles', 
      'mechanic_profiles', 
      'parts',
      'work_orders',
      'payments',
      'inventory_txns',
      'feedbacks',
      'work_order_mechanics',
      'work_order_materials'
    ];
    
    for (const table of expectedTables) {
      if (!tables.includes(table)) {
        throw new Error(`表 ${table} 不存在`);
      }
    }
    
    // 验证数据
    const userCount = await User.count();
    const vehicleCount = await Vehicle.count();
    const partCount = await Part.count();
    const mechanicCount = await MechanicProfile.count();
    
    console.log('✅ 数据库验证通过');
    console.log(`📊 数据统计:`);
    console.log(`   用户: ${userCount}`);
    console.log(`   车辆: ${vehicleCount}`);
    console.log(`   配件: ${partCount}`);
    console.log(`   技师档案: ${mechanicCount}`);
    
  } catch (error) {
    console.error('❌ 数据库验证失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始初始化数据库...');
    
    // 解析命令行参数
    const args = process.argv.slice(2);
    const forceRebuild = args.includes('--force') || args.includes('-f');
    const includeSampleData = args.includes('--sample-data');
    
    if (forceRebuild) {
      console.log('⚠️  强制重建模式：将删除所有现有表');
      await dropAllTables();
    }
    
    // 初始化数据库连接和表结构
    await initDatabase({
      force: forceRebuild, // 根据参数决定是否强制重建
      alter: !forceRebuild  // 如果不是强制重建，则允许修改表结构
    });
    
    // 创建初始管理员
    await createInitialAdmin();
    
    // 创建示例数据（可选）
    if (includeSampleData) {
      await createSampleData();
    }
    
    // 验证数据库
    await validateDatabase();
    
    console.log('🎉 数据库初始化完成！');
    
    if (forceRebuild) {
      console.log('📝 使用了强制重建模式，所有数据已重新创建');
    }
    
  } catch (error) {
    console.error('💥 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createInitialAdmin,
  createSampleData,
  validateDatabase,
  dropAllTables
}; 