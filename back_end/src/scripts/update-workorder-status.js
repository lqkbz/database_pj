/**
 * 更新 work_order_mechanics 表的 status 字段枚举值
 * 将原来的 ['accepted', 'refused', 'completed'] 
 * 改为 ['not_started', 'in_progress', 'completed', 'paused']
 */

const { sequelize } = require('../models');

async function updateWorkOrderMechanicStatus() {
  console.log('开始更新 work_order_mechanics 表的 status 字段...');
  
  try {
    // 首先检查表是否存在
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'work_order_mechanics'
    `);
    
    if (results[0].count === 0) {
      console.log('work_order_mechanics 表不存在，跳过迁移');
      return;
    }
    
    // 检查现有数据
    console.log('1. 检查现有数据...');
    const existingRecords = await sequelize.query(
      'SELECT order_id, mechanic_id, status FROM work_order_mechanics',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`发现 ${existingRecords.length} 条现有记录`);
    
    // 映射旧状态到新状态
    const statusMapping = {
      'accepted': 'not_started',  // 已接受 -> 未开始
      'refused': 'paused',        // 已拒绝 -> 暂停
      'completed': 'completed'    // 已完成 -> 已完成
    };
    
    // 开始事务
    const transaction = await sequelize.transaction();
    
    try {
      // 2. 添加临时列
      console.log('2. 添加临时状态列...');
      await sequelize.query(`
        ALTER TABLE work_order_mechanics 
        ADD COLUMN temp_status ENUM('not_started', 'in_progress', 'completed', 'paused') 
        DEFAULT 'not_started'
      `, { transaction });
      
      // 3. 迁移现有数据
      console.log('3. 迁移现有数据...');
      for (const record of existingRecords) {
        const newStatus = statusMapping[record.status] || 'not_started';
        await sequelize.query(`
          UPDATE work_order_mechanics 
          SET temp_status = ? 
          WHERE order_id = ? AND mechanic_id = ?
        `, { 
          replacements: [newStatus, record.order_id, record.mechanic_id],
          transaction 
        });
      }
      
      // 4. 删除旧列
      console.log('4. 删除旧状态列...');
      await sequelize.query('ALTER TABLE work_order_mechanics DROP COLUMN status', { transaction });
      
      // 5. 重命名新列
      console.log('5. 重命名新状态列...');
      await sequelize.query(`
        ALTER TABLE work_order_mechanics 
        CHANGE temp_status status ENUM('not_started', 'in_progress', 'completed', 'paused') 
        DEFAULT 'not_started'
      `, { transaction });
      
      await transaction.commit();
      
      console.log('✅ work_order_mechanics 表状态字段更新完成！');
      
      // 验证更新结果
      const updatedRecords = await sequelize.query(
        'SELECT order_id, mechanic_id, status FROM work_order_mechanics',
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('更新后的数据统计：');
      const statusCount = {};
      updatedRecords.forEach(record => {
        statusCount[record.status] = (statusCount[record.status] || 0) + 1;
      });
      console.log(statusCount);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateWorkOrderMechanicStatus()
    .then(() => {
      console.log('数据库更新完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库更新失败:', error);
      process.exit(1);
    });
}

module.exports = { updateWorkOrderMechanicStatus }; 