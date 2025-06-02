/**
 * 工单技师关联模型 - WorkOrderMechanic Model
 * 
 * 功能说明：
 * - 管理工单与技师的多对多关系
 * - 记录技师在工单中的工作时长和状态
 * - 跟踪技师的工作进度和备注
 * 
 * 数据表：WORKORDER_MECHANIC
 * 主要字段：
 * - order_id: BIGINT, 外键->WorkOrder（复合主键）
 * - mechanic_id: BIGINT, 外键->MechanicProfile（复合主键）
 * - hours_worked: DECIMAL(4,1), 工作时长
 * - status: ENUM('accepted','refused','completed'), 技师状态
 * - note: TEXT, 工作备注
 * 
 * 关联关系：
 * - 一个工单可以分配给多个技师
 * - 一个技师可以参与多个工单
 */

class WorkOrderMechanic {
  constructor(db) {
    this.db = db;
    this.tableName = 'work_order_mechanics';
  }

  // 创建工单技师关联表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        order_id BIGINT NOT NULL,
        mechanic_id BIGINT NOT NULL,
        hours_worked DECIMAL(4,1) DEFAULT 0,
        status ENUM('accepted','refused','completed') DEFAULT 'accepted',
        note TEXT,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (order_id, mechanic_id),
        FOREIGN KEY (order_id) REFERENCES work_orders(order_id),
        FOREIGN KEY (mechanic_id) REFERENCES mechanic_profiles(mechanic_id),
        INDEX idx_mechanic_id (mechanic_id),
        INDEX idx_status (status)
      )`;
    // 执行SQL创建表
  }

  // 分配技师到工单
  async assign(orderId, mechanicId, note = null) {
    // 创建工单技师关联记录
    // 检查技师是否已经分配到该工单
  }

  // 技师接受工单
  async accept(orderId, mechanicId) {
    // 更新状态为accepted
    // 设置开始时间
  }

  // 技师拒绝工单
  async refuse(orderId, mechanicId, reason) {
    // 更新状态为refused
    // 记录拒绝原因
  }

  // 技师开始工作
  async startWork(orderId, mechanicId) {
    // 设置开始工作时间
    // 更新工单状态为in_progress
  }

  // 技师完成工作
  async completeWork(orderId, mechanicId, hoursWorked, note) {
    // 更新状态为completed
    // 记录工作时长和备注
    // 设置完成时间
  }

  // 更新工作时长
  async updateHours(orderId, mechanicId, hoursWorked) {
    // 更新技师的工作时长
  }

  // 获取工单的所有技师
  async getOrderMechanics(orderId) {
    // 返回工单分配的所有技师及其工作状态
  }

  // 获取技师的工单列表
  async getMechanicOrders(mechanicId, status = null) {
    // 返回技师参与的工单列表
  }

  // 获取技师的工作统计
  async getMechanicStats(mechanicId, dateRange) {
    // 返回技师的工作时长、完成工单数等统计
  }

  // 移除技师分配
  async removeAssignment(orderId, mechanicId) {
    // 删除工单技师关联记录
  }

  // 获取技师当前工作负载
  async getMechanicWorkload(mechanicId) {
    // 返回技师当前进行中的工单数量
  }

  // 批量分配技师
  async batchAssign(orderId, mechanicIds) {
    // 批量分配多个技师到工单
  }
}

module.exports = WorkOrderMechanic; 