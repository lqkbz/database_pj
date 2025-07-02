/**
 * 工单模型 - WorkOrder Model
 * 
 * 功能说明：
 * - 管理维修工单的基本信息
 * - 跟踪工单状态和进度
 * - 关联客户、车辆和技师
 * 
 * 数据表：WORKORDER
 * 主要字段：
 * - order_id: BIGINT, 主键
 * - vehicle_id: BIGINT, 外键->VEHICLE
 * - customer_id: BIGINT, 外键->USER
 * - status: ENUM('pending','assigned','in_progress','done','cancel'), 工单状态
 * - created_at: DATETIME, 创建时间
 * - finished_at: DATETIME, 完成时间
 * - description: TEXT, 描述
 * - trade: ENUM('engine','paint','electric'), 需要的技师工种
 * 
 * 关联关系：
 * - 一个工单属于一个客户和一辆车
 * - 一个工单可以分配给多个技师
 * - 一个工单可以使用多种配件
 * - 一个工单有一个支付记录
 * - 一个工单可以有多个反馈
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkOrder:
 *       type: object
 *       properties:
 *         order_id:
 *           type: integer
 *           description: 工单唯一标识符
 *         vehicle_id:
 *           type: integer
 *           description: 车辆ID
 *         customer_id:
 *           type: integer
 *           description: 客户ID
 *         status:
 *           type: string
 *           enum: [pending, assigned, in_progress, done, cancel]
 *           description: 工单状态
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         finished_at:
 *           type: string
 *           format: date-time
 *           description: 完成时间
 *         description:
 *           type: string
 *           description: 工单描述
 *         trade:
 *           type: string
 *           enum: [engine, paint, electric]
 *           description: 需要的技师工种
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkOrder = sequelize.define('WorkOrder', {
    order_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'order_id'
    },
    vehicle_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'vehicle_id',
      references: {
        model: 'vehicles',
        key: 'vehicle_id'
      }
    },
    customer_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'customer_id',
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'assigned', 'in_progress', 'done', 'cancel'),
      defaultValue: 'pending',
      field: 'status'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    finished_at: {
      type: DataTypes.DATE,
      field: 'finished_at'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description'
    },
    trade: {
      type: DataTypes.ENUM('engine', 'paint', 'electric'),
      field: 'trade',
      allowNull: false
    }
  }, {
    tableName: 'work_orders',
    timestamps: false,
    indexes: [
      {
        fields: ['customer_id']
      },
      {
        fields: ['vehicle_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['trade']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // 实例方法：分配技师
  WorkOrder.prototype.assignMechanic = async function(mechanicId, note = null) {
    const models = sequelize.models;
    return await models.WorkOrderMechanic.create({
      order_id: this.order_id,
      mechanic_id: mechanicId,
      note: note
    });
  };

  // 实例方法：添加配件
  WorkOrder.prototype.addMaterial = async function(partId, quantity, price) {
    const models = sequelize.models;
    return await models.WorkOrderMaterial.create({
      order_id: this.order_id,
      part_id: partId,
      qty: quantity,
      price: price
    });
  };

  // 实例方法：更新状态
  WorkOrder.prototype.updateStatus = async function(newStatus, reason = null) {
    this.status = newStatus;
    if (newStatus === 'done') {
      this.finished_at = new Date();
    }
    return await this.save();
  };

  // 实例方法：查找合适的技师
  WorkOrder.prototype.findSuitableMechanics = async function() {
    const models = sequelize.models;
    return await models.MechanicProfile.findAll({
      where: { trade: this.trade },
      include: [{
        model: models.User,
        as: 'user',
        attributes: ['user_id', 'name']
      }]
    });
  };

  // 实例方法：计算总费用
  WorkOrder.prototype.calculateTotalCost = async function() {
    const models = sequelize.models;
    
    // 计算配件费用
    const materialCost = await models.WorkOrderMaterial.findAll({
      where: { order_id: this.order_id },
      attributes: [
        [sequelize.fn('SUM', sequelize.literal('qty * price')), 'total_material_cost']
      ],
      raw: true
    });

    // 计算人工费用
    const laborCost = await models.WorkOrderMechanic.findAll({
      where: { order_id: this.order_id },
      include: [{
        model: models.MechanicProfile,
        as: 'mechanic',
        attributes: ['hourly_rate']
      }],
      attributes: [
        [sequelize.fn('SUM', sequelize.literal('hours_worked * mechanic.hourly_rate')), 'total_labor_cost']
      ],
      raw: true
    });

    return {
      material_cost: parseFloat(materialCost[0].total_material_cost) || 0,
      labor_cost: parseFloat(laborCost[0].total_labor_cost) || 0
    };
  };

  // 类方法：获取统计信息
  WorkOrder.getStatistics = async function(startDate, endDate) {
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await WorkOrder.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('order_id')), 'total_orders'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'done' THEN 1 END")), 'completed_orders'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'in_progress' THEN 1 END")), 'in_progress_orders'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pending_orders']
      ],
      raw: true
    });
  };

  // 类方法：按工种统计工单
  WorkOrder.getStatisticsByTrade = async function(startDate, endDate) {
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await WorkOrder.findAll({
      where: whereClause,
      attributes: [
        'trade',
        [sequelize.fn('COUNT', sequelize.col('order_id')), 'total_orders'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'done' THEN 1 END")), 'completed_orders']
      ],
      group: ['trade'],
      raw: true
    });
  };

  // 定义关联关系
  WorkOrder.associate = function(models) {
    // 工单属于一个客户
    WorkOrder.belongsTo(models.User, {
      foreignKey: 'customer_id',
      as: 'customer'
    });

    // 工单属于一辆车
    WorkOrder.belongsTo(models.Vehicle, {
      foreignKey: 'vehicle_id',
      as: 'vehicle'
    });

    // 工单有多个技师分配
    WorkOrder.hasMany(models.WorkOrderMechanic, {
      foreignKey: 'order_id',
      as: 'mechanics'
    });

    // 工单使用多种配件
    WorkOrder.hasMany(models.WorkOrderMaterial, {
      foreignKey: 'order_id',
      as: 'materials'
    });

    // 工单有一个支付记录
    WorkOrder.hasOne(models.Payment, {
      foreignKey: 'order_id',
      as: 'payment'
    });

    // 工单有多个反馈
    WorkOrder.hasMany(models.Feedback, {
      foreignKey: 'order_id',
      as: 'feedbacks'
    });

    // 工单关联库存交易（出库）
    WorkOrder.hasMany(models.InventoryTxn, {
      foreignKey: 'order_id',
      as: 'inventoryTransactions'
    });
  };

  return WorkOrder;
}; 