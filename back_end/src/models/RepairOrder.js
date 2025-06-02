/**
 * 维修工单模型
 */
class RepairOrder {
  constructor(db) {
    this.db = db;
    this.tableName = 'repair_orders';
  }

  // 创建维修工单表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        vehicle_id INT NOT NULL,
        customer_id INT NOT NULL,
        technician_id INT,
        receptionist_id INT NOT NULL,
        status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        description TEXT NOT NULL,
        diagnosis TEXT,
        estimated_cost DECIMAL(10, 2),
        actual_cost DECIMAL(10, 2),
        estimated_completion_date DATE,
        actual_completion_date DATE,
        customer_approval BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (technician_id) REFERENCES users(id),
        FOREIGN KEY (receptionist_id) REFERENCES users(id)
      )
    `;
    return await this.db.query(sql);
  }

  // 生成工单号
  generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RO${year}${month}${day}${random}`;
  }

  // 创建维修工单
  async create(orderData) {
    const order_number = this.generateOrderNumber();
    const {
      vehicle_id, customer_id, technician_id, receptionist_id,
      description, estimated_cost, estimated_completion_date, priority
    } = orderData;
    
    const sql = `
      INSERT INTO ${this.tableName} 
      (order_number, vehicle_id, customer_id, technician_id, receptionist_id, 
       description, estimated_cost, estimated_completion_date, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await this.db.query(sql, [
      order_number, vehicle_id, customer_id, technician_id, receptionist_id,
      description, estimated_cost, estimated_completion_date, priority
    ]);
    
    return { id: result.insertId, order_number };
  }

  // 根据ID查找工单
  async findById(id) {
    const sql = `
      SELECT ro.*, 
             v.license_plate, v.brand, v.model,
             c.full_name as customer_name, c.phone as customer_phone,
             t.full_name as technician_name,
             r.full_name as receptionist_name
      FROM ${this.tableName} ro
      LEFT JOIN vehicles v ON ro.vehicle_id = v.id
      LEFT JOIN users c ON ro.customer_id = c.id
      LEFT JOIN users t ON ro.technician_id = t.id
      LEFT JOIN users r ON ro.receptionist_id = r.id
      WHERE ro.id = ? LIMIT 1
    `;
    const results = await this.db.query(sql, [id]);
    return results[0];
  }

  // 根据工单号查找
  async findByOrderNumber(orderNumber) {
    const sql = `
      SELECT ro.*, 
             v.license_plate, v.brand, v.model,
             c.full_name as customer_name, c.phone as customer_phone
      FROM ${this.tableName} ro
      LEFT JOIN vehicles v ON ro.vehicle_id = v.id
      LEFT JOIN users c ON ro.customer_id = c.id
      WHERE ro.order_number = ? LIMIT 1
    `;
    const results = await this.db.query(sql, [orderNumber]);
    return results[0];
  }

  // 更新工单
  async update(id, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const sql = `UPDATE ${this.tableName} SET ${fields} WHERE id = ?`;
    return await this.db.query(sql, values);
  }

  // 获取所有工单（分页）
  async findAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT ro.*, 
             v.license_plate, v.brand, v.model,
             c.full_name as customer_name,
             t.full_name as technician_name
      FROM ${this.tableName} ro
      LEFT JOIN vehicles v ON ro.vehicle_id = v.id
      LEFT JOIN users c ON ro.customer_id = c.id
      LEFT JOIN users t ON ro.technician_id = t.id
    `;
    
    const conditions = [];
    const values = [];

    if (filters.status) {
      conditions.push('ro.status = ?');
      values.push(filters.status);
    }
    if (filters.technician_id) {
      conditions.push('ro.technician_id = ?');
      values.push(filters.technician_id);
    }
    if (filters.customer_id) {
      conditions.push('ro.customer_id = ?');
      values.push(filters.customer_id);
    }
    if (filters.priority) {
      conditions.push('ro.priority = ?');
      values.push(filters.priority);
    }
    if (filters.date_from) {
      conditions.push('DATE(ro.created_at) >= ?');
      values.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push('DATE(ro.created_at) <= ?');
      values.push(filters.date_to);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY ro.created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const results = await this.db.query(sql, values);
    
    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ro`;
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

  // 获取技师的工单
  async findByTechnician(technicianId, status = null) {
    let sql = `
      SELECT ro.*, 
             v.license_plate, v.brand, v.model,
             c.full_name as customer_name
      FROM ${this.tableName} ro
      LEFT JOIN vehicles v ON ro.vehicle_id = v.id
      LEFT JOIN users c ON ro.customer_id = c.id
      WHERE ro.technician_id = ?
    `;
    
    const values = [technicianId];
    
    if (status) {
      sql += ' AND ro.status = ?';
      values.push(status);
    }
    
    sql += ' ORDER BY ro.priority DESC, ro.created_at DESC';
    
    return await this.db.query(sql, values);
  }

  // 获取工单统计
  async getStatistics(dateRange = {}) {
    let sql = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(actual_cost) as total_revenue,
        AVG(actual_cost) as average_order_value
      FROM ${this.tableName}
    `;
    
    const conditions = [];
    const values = [];
    
    if (dateRange.start) {
      conditions.push('DATE(created_at) >= ?');
      values.push(dateRange.start);
    }
    if (dateRange.end) {
      conditions.push('DATE(created_at) <= ?');
      values.push(dateRange.end);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    const results = await this.db.query(sql, values);
    return results[0];
  }
}

module.exports = RepairOrder; 