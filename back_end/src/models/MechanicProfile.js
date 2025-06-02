/**
 * 技师档案模型 - MechanicProfile Model
 * 
 * 功能说明：
 * - 管理技师的专业信息和资质
 * - 记录技师的工作能力和薪资信息
 * - 与用户表一对一关联
 * 
 * 数据表：MECHANIC_PROFILE
 * 主要字段：
 * - mechanic_id: BIGINT, 主键（等于user_id）
 * - trade: ENUM('engine','paint','electric'), 专业领域
 * - hourly_rate: DECIMAL(6,2), 时薪
 * - hire_date: DATE, 入职日期
 * - cert_no: VARCHAR, 资质证书编号
 * 
 * 关联关系：
 * - 一个技师档案对应一个用户（mechanic角色）
 * - 一个技师可以参与多个工单
 */

class MechanicProfile {
  constructor(db) {
    this.db = db;
    this.tableName = 'mechanic_profiles';
  }

  // 创建技师档案表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        mechanic_id BIGINT PRIMARY KEY,
        trade ENUM('engine','paint','electric'),
        hourly_rate DECIMAL(6,2),
        hire_date DATE,
        cert_no VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (mechanic_id) REFERENCES users(user_id),
        INDEX idx_trade (trade)
      )`;
    // 执行SQL创建表
  }

  // 创建技师档案
  async create(profileData) {
    // 验证用户角色必须是mechanic
    // 创建技师档案
  }

  // 根据技师ID查找档案
  async findById(mechanicId) {
    // 返回技师详细信息
  }

  // 根据专业领域查找技师
  async findByTrade(trade) {
    // 返回指定专业的所有技师
  }

  // 更新技师档案
  async update(mechanicId, updateData) {
    // 更新技师信息
  }

  // 获取技师的工作统计
  async getWorkStats(mechanicId, dateRange) {
    // 返回工作时长、完成工单数等统计
  }

  // 获取可用技师列表
  async getAvailableMechanics() {
    // 返回当前可分配的技师
  }

  // 计算技师薪资
  async calculateSalary(mechanicId, startDate, endDate) {
    // 根据工时和时薪计算薪资
  }
}

module.exports = MechanicProfile; 