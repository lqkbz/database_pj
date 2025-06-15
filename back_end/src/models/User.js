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
 *         id:
 *           type: string
 *           description: 用户唯一标识符
 *         username:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           format: email
 *           description: 电子邮箱
 *         fullName:
 *           type: string
 *           description: 全名
 *         phone:
 *           type: string
 *           description: 电话号码
 *         role:
 *           type: string
 *           enum: [customer, mechanic, admin]
 *           description: 用户角色
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *           description: 账号状态
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 账号创建时间
 *     UserDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/User'
 *         - type: object
 *           properties:
 *             address:
 *               type: string
 *               description: 用户地址
 *             lastLogin:
 *               type: string
 *               format: date-time
 *               description: 最后登录时间
 *             vehicles:
 *               type: array
 *               description: 用户的车辆
 *               items:
 *                 $ref: '#/components/schemas/Vehicle'
 *             recentOrders:
 *               type: array
 *               description: 近期工单
 *               items:
 *                 $ref: '#/components/schemas/WorkOrderSummary'
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           description: 当前页码
 *         limit:
 *           type: integer
 *           description: 每页数量
 *         total:
 *           type: integer
 *           description: 总记录数
 *         pages:
 *           type: integer
 *           description: 总页数
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  address: {
    type: String
  },
  role: {
    type: String,
    enum: ['customer', 'mechanic', 'admin'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  avatar: {
    type: String
  },
  lastLogin: {
    type: Date
  }
}, { timestamps: true });

// 添加密码哈希中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 添加密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 创建和导出模型
module.exports = mongoose.model('User', userSchema); 