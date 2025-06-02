/**
 * 工单配件关联模型 - WorkOrderMaterial Model
 * 
 * 功能说明：
 * - 管理工单与配件的多对多关系
 * - 记录工单中使用的配件数量和价格
 * - 跟踪配件的使用情况和成本
 * 
 * 数据表：WORKORDER_MATERIAL
 * 主要字段：
 * - order_id: BIGINT, 外键->WorkOrder（复合主键）
 * - part_id: BIGINT, 外键->Part（复合主键）
 * - qty: INT, 使用数量
 * - price: DECIMAL(10,2), 单价
 * 
 * 关联关系：
 * - 一个工单可以使用多种配件
 * - 一种配件可以用于多个工单
 */

class WorkOrderMaterial {
  constructor(db) {
    this.db = db;
    this.tableName = 'work_order_materials';
  }

  // 创建工单配件关联表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        order_id BIGINT NOT NULL,
        part_id BIGINT NOT NULL,
        qty INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) GENERATED ALWAYS AS (qty * price) STORED,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (order_id, part_id),
        FOREIGN KEY (order_id) REFERENCES work_orders(order_id),
        FOREIGN KEY (part_id) REFERENCES parts(part_id),
        FOREIGN KEY (added_by) REFERENCES users(user_id),
        INDEX idx_part_id (part_id),
        INDEX idx_added_at (added_at)
      )`;
    // 执行SQL创建表
  }

  // 添加配件到工单
  async addMaterial(orderId, partId, quantity, price, addedBy) {
    // 检查库存是否充足
    // 添加配件使用记录
    // 创建库存出库记录
  }

  // 更新配件数量
  async updateQuantity(orderId, partId, newQuantity) {
    // 更新配件使用数量
    // 调整库存记录
  }

  // 移除配件
  async removeMaterial(orderId, partId) {
    // 删除配件使用记录
    // 恢复库存
  }

  // 获取工单的所有配件
  async getOrderMaterials(orderId) {
    // 返回工单使用的所有配件详情
  }

  // 获取配件的使用历史
  async getPartUsageHistory(partId, dateRange) {
    // 返回配件在各工单中的使用记录
  }

  // 计算工单的配件总成本
  async calculateMaterialCost(orderId) {
    // 计算工单所有配件的总费用
  }

  // 批量添加配件
  async batchAddMaterials(orderId, materials, addedBy) {
    // 批量添加多个配件到工单
    // materials: [{partId, quantity, price}, ...]
  }

  // 获取配件使用统计
  async getMaterialStats(dateRange) {
    // 返回期间内配件使用统计
  }

  // 检查配件库存
  async checkMaterialAvailability(orderId) {
    // 检查工单所需配件的库存是否充足
  }

  // 预留配件库存
  async reserveMaterials(orderId) {
    // 为工单预留所需配件库存
  }

  // 释放预留库存
  async releaseReservedMaterials(orderId) {
    // 释放工单的预留库存
  }

  // 获取最常用配件
  async getMostUsedParts(limit = 10, dateRange) {
    // 返回使用频率最高的配件列表
  }
}

module.exports = WorkOrderMaterial; 