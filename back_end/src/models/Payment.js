/**
 * 支付模型 - Payment Model
 * 
 * 功能说明：
 * - 管理工单的支付信息
 * - 记录人工费和配件费
 * - 跟踪支付状态和支付时间
 * 
 * 数据表：PAYMENT
 * 主要字段：
 * - payment_id: BIGINT, 主键
 * - order_id: BIGINT, 外键->WorkOrder（唯一）
 * - labor_fee: DECIMAL(10,2), 人工费
 * - material_fee: DECIMAL(10,2), 配件费
 * - total_fee: DECIMAL(10,2), 总费用
 * - paid_at: DATETIME, 支付时间（可空）
 * 
 * 关联关系：
 * - 一个工单对应一个支付记录
 */

class Payment {
  constructor(db) {
    this.db = db;
    this.tableName = 'payments';
  }

  // 创建支付表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        order_id BIGINT UNIQUE NOT NULL,
        labor_fee DECIMAL(10,2) DEFAULT 0,
        material_fee DECIMAL(10,2) DEFAULT 0,
        total_fee DECIMAL(10,2) GENERATED ALWAYS AS (labor_fee + material_fee) STORED,
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES work_orders(order_id),
        INDEX idx_payment_status (payment_status),
        INDEX idx_paid_at (paid_at)
      )`;
    // 执行SQL创建表
  }

  // 创建支付记录
  async create(orderId, laborFee, materialFee, discount = 0) {
    // 创建工单的支付记录
    // 计算总费用
  }

  // 根据工单ID查找支付记录
  async findByOrderId(orderId) {
    // 返回工单的支付信息
  }

  // 更新费用
  async updateFees(paymentId, laborFee, materialFee, discount = 0) {
    // 更新人工费、配件费和折扣
  }

  // 处理支付
  async processPayment(paymentId, paymentMethod, paidAmount) {
    // 记录支付信息
    // 更新支付状态为已支付
    // 设置支付时间
  }

  // 退款处理
  async processRefund(paymentId, refundAmount, reason) {
    // 处理退款
    // 更新支付状态
  }

  // 取消支付
  async cancelPayment(paymentId, reason) {
    // 取消支付
    // 更新状态为已取消
  }

  // 获取支付统计
  async getPaymentStats(dateRange) {
    // 返回期间内的支付统计
    // 包括总收入、支付方式分布等
  }

  // 获取未支付的工单
  async getUnpaidOrders() {
    // 返回所有未支付的工单列表
  }

  // 获取收入报表
  async getRevenueReport(startDate, endDate, groupBy = 'day') {
    // 返回收入报表
    // 支持按日、周、月分组
  }

  // 计算技师提成
  async calculateCommission(mechanicId, dateRange) {
    // 根据技师参与的工单计算提成
  }

  // 获取客户消费记录
  async getCustomerPayments(customerId) {
    // 返回客户的所有支付记录
  }

  // 批量更新支付状态
  async batchUpdateStatus(paymentIds, status) {
    // 批量更新多个支付记录的状态
  }
}

module.exports = Payment; 