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
 *         vehicle_id:
 *           type: integer
 *           description: 车辆唯一标识符
 *         user_id:
 *           type: integer
 *           description: 车主ID
 *         plate_no:
 *           type: string
 *           description: 车牌号
 *         vin:
 *           type: string
 *           description: 车辆识别号
 *         model:
 *           type: string
 *           description: 车型
 *         year:
 *           type: integer
 *           description: 车辆年份
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vehicle = sequelize.define('Vehicle', {
    vehicle_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'vehicle_id'
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    plate_no: {
      type: DataTypes.STRING,
      unique: true,
      field: 'plate_no'
    },
    vin: {
      type: DataTypes.STRING,
      field: 'vin'
    },
    model: {
      type: DataTypes.STRING,
      field: 'model'
    },
    year: {
      type: DataTypes.SMALLINT,
      field: 'year'
    }
  }, {
    tableName: 'vehicles',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['plate_no']
      },
      {
        fields: ['user_id']
      }
    ]
  });

  // 实例方法：获取维修历史
  Vehicle.prototype.getRepairHistory = async function() {
    const models = sequelize.models;
    return await models.WorkOrder.findAll({
      where: { vehicle_id: this.vehicle_id },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: models.User,
          as: 'customer',
          attributes: ['name']
        }
      ]
    });
  };

  // 实例方法：获取最近一次维修
  Vehicle.prototype.getLastRepair = async function() {
    const models = sequelize.models;
    return await models.WorkOrder.findOne({
      where: { vehicle_id: this.vehicle_id },
      order: [['created_at', 'DESC']]
    });
  };

  // 实例方法：获取维修统计
  Vehicle.prototype.getRepairStats = async function() {
    const models = sequelize.models;
    const stats = await models.WorkOrder.findAll({
      where: { vehicle_id: this.vehicle_id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('order_id')), 'total_repairs'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'done' THEN 1 END")), 'completed_repairs']
      ],
      include: [{
        model: models.Payment,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_fee')), 'total_cost']
        ]
      }],
      raw: true
    });
    return stats[0];
  };

  // 定义关联关系
  Vehicle.associate = function(models) {
    // 车辆属于一个用户
    Vehicle.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'owner'
    });

    // 车辆有多个工单
    Vehicle.hasMany(models.WorkOrder, {
      foreignKey: 'vehicle_id',
      as: 'workOrders'
    });
  };

  // 类方法：获取用户的车辆列表
  Vehicle.getUserVehicles = async function(userId) {
    return await Vehicle.findAll({
      where: { user_id: userId },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['name']
      }],
      order: [['created_at', 'DESC']]
    });
  };

  return Vehicle;
}; 