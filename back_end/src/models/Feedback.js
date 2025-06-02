/**
 * 反馈模型 - Feedback Model
 * 
 * 功能说明：
 * - 管理客户对维修服务的反馈
 * - 支持评分和催单两种类型
 * - 记录客户的评价和建议
 * 
 * 数据表：FEEDBACK
 * 主要字段：
 * - feedback_id: BIGINT, 主键
 * - order_id: BIGINT, 外键->WorkOrder
 * - user_id: BIGINT, 外键->USER（反馈人）
 * - type: ENUM('rating','urge'), 反馈类型
 * - rating: INT, 评分（可空）
 * - comment: TEXT, 评价内容
 * - created_at: DATETIME, 创建时间
 * 
 * 关联关系：
 * - 一个工单可以有多个反馈
 * - 一个用户可以提交多个反馈
 */

class Feedback {
  constructor(db) {
    this.db = db;
    this.tableName = 'feedbacks';
  }

  // 创建反馈表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        feedback_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        order_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        type ENUM('rating','urge') NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        is_anonymous BOOLEAN DEFAULT FALSE,
        status ENUM('pending','reviewed','resolved') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES work_orders(order_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_rating (rating),
        INDEX idx_created_at (created_at)
      )`;
    // 执行SQL创建表
  }

  // 提交评分反馈
  async submitRating(orderId, userId, rating, comment, isAnonymous = false) {
    // 创建评分反馈
    // 验证评分范围（1-5）
    // 检查用户是否有权限评价该工单
  }

  // 提交催单反馈
  async submitUrge(orderId, userId, comment) {
    // 创建催单反馈
    // 通知相关技师和管理员
  }

  // 获取工单的所有反馈
  async getOrderFeedbacks(orderId) {
    // 返回工单的所有反馈记录
  }

  // 获取用户的反馈历史
  async getUserFeedbacks(userId) {
    // 返回用户提交的所有反馈
  }

  // 获取评分统计
  async getRatingStats(dateRange) {
    // 返回评分分布统计
    // 平均评分、各星级数量等
  }

  // 获取技师的评分
  async getMechanicRatings(mechanicId, dateRange) {
    // 返回技师参与工单的评分情况
  }

  // 管理员回复反馈
  async adminReply(feedbackId, adminId, reply) {
    // 管理员回复客户反馈
    // 更新状态为已回复
  }

  // 标记反馈为已解决
  async markAsResolved(feedbackId) {
    // 更新反馈状态为已解决
  }

  // 获取待处理的反馈
  async getPendingFeedbacks() {
    // 返回所有待处理的反馈
  }

  // 获取催单列表
  async getUrgeList() {
    // 返回所有催单反馈
  }

  // 删除反馈
  async deleteFeedback(feedbackId, userId) {
    // 软删除反馈（只有反馈人可以删除）
  }

  // 获取服务质量报告
  async getServiceQualityReport(dateRange) {
    // 返回服务质量分析报告
    // 包括平均评分、满意度趋势等
  }

  // 获取最新反馈
  async getRecentFeedbacks(limit = 10) {
    // 返回最新的反馈列表
  }

  // 搜索反馈
  async searchFeedbacks(keyword, filters = {}) {
    // 根据关键词和筛选条件搜索反馈
  }
}

module.exports = Feedback; 