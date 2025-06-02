/**
 * 配件模型 - Part Model
 * 
 * 功能说明：
 * - 管理维修配件的基本信息
 * - 跟踪配件的库存和价格
 * - 记录配件的使用情况
 * 
 * 数据表：PART
 * 主要字段：
 * - part_id: BIGINT, 主键
 * - name: VARCHAR, 配件名称
 * - unit: ENUM('pcs','L','kg'), 计量单位
 * - unit_cost: DECIMAL(10,2), 单位成本
 * 
 * 关联关系：
 * - 一个配件可以用于多个工单
 * - 一个配件可以有多条库存交易记录
 */

class Part {
  constructor(db) {
    this.db = db;
    this.tableName = 'parts';
  }

  // 创建配件表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        part_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        unit ENUM('pcs','L','kg') NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        stock_quantity INT DEFAULT 0,
        min_stock INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_category (category)
      )`;
    // 执行SQL创建表
  }

  // 创建新配件
  async create(partData) {
    // 插入配件基本信息
  }

  // 根据ID查找配件
  async findById(partId) {
    // 返回配件详细信息
  }

  // 搜索配件
  async search(keyword, category) {
    // 根据名称或类别搜索配件
  }

  // 更新配件信息
  async update(partId, updateData) {
    // 更新配件基本信息（不包括库存）
  }

  // 获取库存信息
  async getStock(partId) {
    // 返回当前库存数量和价值
  }

  // 获取低库存配件
  async getLowStockParts() {
    // 返回库存低于最小库存的配件
  }

  // 获取配件使用历史
  async getUsageHistory(partId, dateRange) {
    // 返回配件在工单中的使用记录
  }

  // 获取配件价格历史
  async getPriceHistory(partId) {
    // 返回配件成本价格变化历史
  }

  // 批量更新配件价格
  async batchUpdatePrices(priceUpdates) {
    // 批量更新多个配件的价格
  }
}

module.exports = Part; 