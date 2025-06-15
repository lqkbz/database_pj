/**
 * 车辆模型 - Vehicle Model
 * 
 * 功能说明：
 * - 管理客户车辆的基本信息
 * - 记录车辆的维修历史
 * - 关联车辆与客户的关系
 * 
 * 数据表：VEHICLE
 * 主要字段：
 * - vehicle_id: BIGINT, 主键
 * - user_id: BIGINT, 外键->USER（车主）
 * - plate_no: VARCHAR, 车牌号（唯一）
 * - vin: VARCHAR, 车架号
 * - model: VARCHAR, 车型
 * - year: SMALLINT, 年份
 * 
 * 关联关系：
 * - 一辆车属于一个用户
 * - 一辆车可以有多个维修工单
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 车辆唯一标识符
 *         make:
 *           type: string
 *           description: 汽车品牌
 *         model:
 *           type: string
 *           description: 汽车型号
 *         year:
 *           type: integer
 *           description: 车辆年份
 *         color:
 *           type: string
 *           description: 车辆颜色
 *         licensePlate:
 *           type: string
 *           description: 车牌号
 *         vin:
 *           type: string
 *           description: 车辆识别号
 *         owner:
 *           type: string
 *           description: 车主ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *     VehicleDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/Vehicle'
 *         - type: object
 *           properties:
 *             maintenanceHistory:
 *               type: array
 *               description: 维修历史记录
 *               items:
 *                 $ref: '#/components/schemas/WorkOrderSummary'
 *     WorkOrderSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 工单ID
 *         description:
 *           type: string
 *           description: 工单描述
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *           description: 工单状态
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: 完成时间
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

class Vehicle {
  constructor(db) {
    this.db = db;
    this.tableName = 'vehicles';
  }

  // 创建车辆表
  async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        vehicle_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        plate_no VARCHAR(20) UNIQUE NOT NULL,
        vin VARCHAR(50),
        model VARCHAR(100),
        year SMALLINT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        INDEX idx_user_id (user_id),
        INDEX idx_plate_no (plate_no)
      )`;
    // 执行SQL创建表
  }

  // 创建新车辆
  async create(vehicleData) {
    // 验证车牌号唯一性
    // 验证用户存在
    // 插入车辆数据
  }

  // 根据ID查找车辆
  async findById(vehicleId) {
    // 返回车辆详细信息
  }

  // 根据车牌号查找车辆
  async findByPlateNo(plateNo) {
    // 返回车辆信息
  }

  // 根据用户ID获取所有车辆
  async findByUserId(userId) {
    // 返回该用户的所有车辆列表
  }

  // 更新车辆信息
  async update(vehicleId, updateData) {
    // 更新车辆基本信息
  }

  // 删除车辆
  async delete(vehicleId) {
    // 软删除或检查是否有关联工单
  }

  // 获取车辆的维修历史
  async getRepairHistory(vehicleId) {
    // 返回该车辆的所有维修工单
  }

  // 获取车辆的最近一次维修
  async getLastRepair(vehicleId) {
    // 返回最近的维修记录
  }

  // 统计车辆的维修次数和费用
  async getRepairStats(vehicleId) {
    // 返回维修统计信息
  }
}

const vehicleSchema = new Schema({
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    trim: true
  },
  licensePlate: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  vin: {
    type: String,
    trim: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// 创建索引
vehicleSchema.index({ owner: 1 });
vehicleSchema.index({ licensePlate: 1 }, { unique: true });

// 添加方法
vehicleSchema.methods.getMaintenanceHistory = async function() {
  // 查询与此车辆关联的工单
  const WorkOrder = mongoose.model('WorkOrder');
  return WorkOrder.find({ vehicle: this._id })
    .sort({ createdAt: -1 })
    .select('description status createdAt completedAt')
    .exec();
};

// 创建和导出模型
module.exports = mongoose.model('Vehicle', vehicleSchema); 