/**
 * 库存交易模型 - InventoryTxn Model
 * 
 * 功能说明：
 * - 记录配件的库存变动历史
 * - 支持入库、出库、调整三种类型
 * - 关联工单的配件出库记录
 * 
 * 数据表：INVENTORY_TXN
 * 主要字段：
 * - txn_id: BIGINT, 主键
 * - part_id: BIGINT, 外键->PART
 * - order_id: BIGINT, 外键->WorkOrder（可空，出库时使用）
 * - qty: INT, 数量（正负表示增减）
 * - type: ENUM('IN','OUT','ADJUST'), 交易类型
 * - created_at: DATETIME, 交易时间
 * 
 * 关联关系：
 * - 一个配件可以有多条库存交易记录
 * - 出库记录关联到具体的工单
 */

class InventoryTxn {
  constructor(db) {
    this.db = db;
    this.tableName = 'inventory_txns';
  }

  // 创建库存交易表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        txn_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        part_id BIGINT NOT NULL,
        order_id BIGINT,
        qty INT NOT NULL,
        type ENUM('IN','OUT','ADJUST') NOT NULL,
        unit_cost DECIMAL(10,2),
        total_cost DECIMAL(10,2),
        reason TEXT,
        operator_id BIGINT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (part_id) REFERENCES parts(part_id),
        FOREIGN KEY (order_id) REFERENCES work_orders(order_id),
        FOREIGN KEY (operator_id) REFERENCES users(user_id),
        INDEX idx_part_id (part_id),
        INDEX idx_order_id (order_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
      )`;
    // 执行SQL创建表
  }

  // 记录入库
  async recordInbound(partId, quantity, unitCost, reason, operatorId) {
    // 创建入库记录
    // 更新配件库存
  }

  // 记录出库（用于工单）
  async recordOutbound(partId, quantity, orderId, operatorId) {
    // 创建出库记录
    // 更新配件库存
    // 验证库存是否充足
  }

  // 记录库存调整
  async recordAdjustment(partId, quantity, reason, operatorId) {
    // 创建调整记录
    // 更新配件库存
  }

  // 获取配件的库存交易历史
  async getPartHistory(partId, dateRange) {
    // 返回指定配件的所有交易记录
  }

  // 获取工单的配件使用记录
  async getOrderParts(orderId) {
    // 返回工单使用的所有配件
  }

  // 计算库存价值
  async calculateInventoryValue(date) {
    // 计算指定日期的库存总价值
  }

  // 获取库存变动报表
  async getInventoryReport(startDate, endDate) {
    // 返回期间内的库存变动统计
  }

  // 批量出库（用于工单）
  async batchOutbound(orderId, parts, operatorId) {
    // 批量处理多个配件的出库
  }
}

module.exports = InventoryTxn; 