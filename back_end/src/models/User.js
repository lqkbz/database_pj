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

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           description: 用户唯一标识符
 *         name:
 *           type: string
 *           description: 用户姓名
 *         role:
 *           type: string
 *           enum: [customer, mechanic, admin]
 *           description: 用户角色
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 账号创建时间
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'user_id'
    },
    role: {
      type: DataTypes.ENUM('customer', 'mechanic', 'admin'),
      allowNull: false,
      field: 'role'
    },
    name: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: 'name'
    },
    password_hash: {
      type: DataTypes.CHAR(60),
      field: 'password_hash'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'users',
    timestamps: false, // 使用自定义的created_at字段
    indexes: [
      {
        fields: ['role']
      }
    ]
  });

  // 实例方法：验证密码
  User.prototype.comparePassword = async function(candidatePassword) {
    if (!this.password_hash) return false;
    return bcrypt.compare(candidatePassword, this.password_hash);
  };

  // 实例方法：设置密码
  User.prototype.setPassword = async function(password) {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(password, salt);
  };

  // 类方法：根据用户名查找用户
  User.findByUsername = async function(username) {
    return await User.findOne({
      where: { name: username }
    });
  };

  // 类方法：创建新用户（带密码加密）
  User.createUser = async function(userData) {
    const { role, name, password } = userData;
    
    // 验证必需字段
    if (!role || !name || !password) {
      throw new Error('缺少必需字段：role, name, password');
    }
    
    // 验证角色
    const validRoles = ['customer', 'mechanic', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error(`无效的用户角色：${role}。有效角色：${validRoles.join(', ')}`);
    }
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({
      where: { name }
    });
    
    if (existingUser) {
      throw new Error(`用户名 "${name}" 已存在`);
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    // 创建用户
    const user = await User.create({
      role,
      name,
      password_hash,
      created_at: new Date()
    });
    
    return user;
  };

  // 定义关联关系
  User.associate = function(models) {
    // 用户拥有多辆车辆（customer角色）
    User.hasMany(models.Vehicle, {
      foreignKey: 'user_id',
      as: 'vehicles'
    });

    // 用户有一个技师档案（mechanic角色）
    User.hasOne(models.MechanicProfile, {
      foreignKey: 'mechanic_id',
      sourceKey: 'user_id',
      as: 'mechanicProfile'
    });

    // 用户创建的工单（customer角色）
    User.hasMany(models.WorkOrder, {
      foreignKey: 'customer_id',
      as: 'customerOrders'
    });

    // 用户提交的反馈
    User.hasMany(models.Feedback, {
      foreignKey: 'user_id', 
      as: 'feedbacks'
    });
  };

  return User;
}; 