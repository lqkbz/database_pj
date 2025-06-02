/**
 * 模型索引文件 - Models Index
 * 
 * 统一导出所有数据模型，方便其他模块引用
 */

const User = require('./User');
const Vehicle = require('./Vehicle');
const MechanicProfile = require('./MechanicProfile');
const Part = require('./Part');
const InventoryTxn = require('./InventoryTxn');
const WorkOrder = require('./WorkOrder');
const WorkOrderMechanic = require('./WorkOrderMechanic');
const WorkOrderMaterial = require('./WorkOrderMaterial');
const Payment = require('./Payment');
const Feedback = require('./Feedback');

// 保留原有的模型（如果需要兼容）
const Customer = require('./Customer');
const Technician = require('./Technician');
const RepairOrder = require('./RepairOrder');

module.exports = {
  // 核心业务模型（推荐使用）
  User,
  Vehicle,
  MechanicProfile,
  Part,
  InventoryTxn,
  WorkOrder,
  WorkOrderMechanic,
  WorkOrderMaterial,
  Payment,
  Feedback,
  

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
 * 模型迁移指南：
 * 
 * 从兼容性模型迁移到新模型的建议：
 * 
 * 1. Customer → User
 *    - 将客户数据迁移到users表，设置role='customer'
 *    - 更新所有引用Customer的代码
 * 
 * 2. Technician → User + MechanicProfile
 *    - 将技师基本信息迁移到users表，设置role='mechanic'
 *    - 将技师专业信息迁移到mechanic_profiles表
 * 
 * 3. RepairOrder → WorkOrder
 *    - 将维修订单数据迁移到work_orders表
 *    - 更新状态枚举值以匹配新设计
 *    - 建立与新关联表的关系
 */ 