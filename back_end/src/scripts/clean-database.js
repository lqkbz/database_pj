/**
 * 数据库清理脚本
 * 
 * 功能：删除所有数据库表
 * 警告：此操作不可逆，请谨慎使用
 */

require('dotenv').config();
const { sequelize } = require('../models');

/**
 * 删除所有表
 */
async function cleanDatabase() {
  try {
    console.log('⚠️  警告：即将删除所有数据库表！');
    console.log('🔄 3秒后开始删除...');
    
    // 等待3秒给用户机会取消
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🗑️  正在删除所有数据库表...');
    
    // 禁用外键检查
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // 获取所有表名
    const tables = await sequelize.getQueryInterface().showAllTables();
    
    if (tables.length === 0) {
      console.log('📝 数据库中没有找到任何表');
      return;
    }
    
    console.log(`📊 找到 ${tables.length} 个表:`);
    tables.forEach(table => console.log(`   - ${table}`));
    console.log('');
    
    // 删除所有表
    for (const table of tables) {
      console.log(`🗑️  删除表: ${table}`);
      await sequelize.getQueryInterface().dropTable(table);
    }
    
    // 重新启用外键检查
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('✅ 所有表删除完成');
    console.log('💡 提示：运行 npm run init-db-sample 来重新创建表和示例数据');
    
  } catch (error) {
    console.error('❌ 删除表失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    await cleanDatabase();
  } catch (error) {
    console.error('💥 数据库清理失败:', error.message);
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
  cleanDatabase
}; 