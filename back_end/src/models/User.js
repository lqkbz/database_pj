/**
 * 用户模型 - User Model
 * 
 * 功能说明：
 * - 管理系统中所有用户的基本信息
 * - 支持三种角色：customer（客户）、mechanic（技师）、admin（管理员）
 * - 处理用户认证和授权
 * 
 * 数据表：USER
 * 主要字段：
 * - user_id: BIGINT, 主键
 * - role: ENUM('customer','mechanic','admin'), 用户角色
 * - name: VARCHAR(60), 用户姓名
 * - password_hash: CHAR(60), 密码哈希
 * - created_at: DATETIME, 创建时间
 * 
 * 关联关系：
 * - 一个用户可以拥有多辆车辆（customer角色）
 * - 一个用户可以有一个技师档案（mechanic角色）
 * - 一个用户可以创建多个工单（customer角色）
 */

class User {
  constructor(db) {
    this.db = db;
    this.tableName = 'users';
  }

  // 创建用户表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        user_id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'technician', 'customer', 'receptionist') DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    return await this.db.query(sql);
  }

  // 创建用户
  async create(userData) {
    const { username, password, email, phone, role, full_name } = userData;
    const sql = `
      INSERT INTO ${this.tableName} (username, password, email, phone, role, full_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.query(sql, [username, password, email, phone, role, full_name]);
    return result.insertId;
  }

  // 根据用户名或邮箱查找用户

  // 根据ID查找用户
  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const results = await this.db.query(sql, [id]);
    return results[0];
  }

  // 更新用户信息
  async update(id, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const sql = `UPDATE ${this.tableName} SET ${fields} WHERE id = ?`;
    return await this.db.query(sql, values);
  }

  // 获取所有用户（分页）
  async findAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let sql = `SELECT id, username, email, phone, role, full_name, status, created_at FROM ${this.tableName}`;
    const conditions = [];
    const values = [];

    if (filters.role) {
      conditions.push('role = ?');
      values.push(filters.role);
    }
    if (filters.status) {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const results = await this.db.query(sql, values);
    
    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await this.db.query(countSql, values.slice(0, -2));
    
    return {
      data: results,
      total: countResult[0].total,
      page,
      limit
    };
  }



  // 验证用户密码
  async verifyPassword(userId, password) {
    // 比对密码哈希
  }

  // 获取用户的所有车辆（customer角色）
  async getVehicles(userId) {
    // 返回用户拥有的车辆列表
  }

  // 获取用户的技师档案（mechanic角色）
  async getMechanicProfile(userId) {
    // 返回技师详细信息
  }

  // 获取用户的工单历史
  async getWorkOrders(userId, role) {
    // 根据角色返回相关工单
    // customer: 作为客户的工单
    // mechanic: 作为技师参与的工单
  }
}

module.exports = User; 