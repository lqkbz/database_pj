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
 * - status: ENUM('not_started','in_progress','completed','paused'), 工作进度状态
 * - note: TEXT, 工作备注
 * 
 * 关联关系：
 * - 一个工单可以分配给多个技师
 * - 一个技师可以参与多个工单
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkOrderMechanic:
 *       type: object
 *       properties:
 *         order_id:
 *           type: integer
 *           description: 工单ID
 *         mechanic_id:
 *           type: integer
 *           description: 技师ID
 *         hours_worked:
 *           type: number
 *           format: decimal
 *           description: 工作时长（小时）
 *         status:
 *           type: string
 *           enum: [not_started, in_progress, completed, paused]
 *           description: 工作进度状态
 *         note:
 *           type: string
 *           description: 工作备注
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkOrderMechanic = sequelize.define('WorkOrderMechanic', {
    order_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      field: 'order_id',
      references: {
        model: 'work_orders',
        key: 'order_id'
      }
    },
    mechanic_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      field: 'mechanic_id',
      references: {
        model: 'mechanic_profiles',
        key: 'mechanic_id'
      }
    },
    hours_worked: {
      type: DataTypes.DECIMAL(4, 1),
      defaultValue: 0,
      field: 'hours_worked'
    },
    status: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'completed', 'paused'),
      defaultValue: 'not_started',
      field: 'status'
    },
    note: {
      type: DataTypes.TEXT,
      field: 'note'
    }
  }, {
    tableName: 'work_order_mechanics',
    timestamps: false,
    indexes: [
      {
        fields: ['mechanic_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  // 实例方法：开始工作
  WorkOrderMechanic.prototype.startWork = async function(note = null) {
    this.status = 'in_progress';
    if (note) this.note = note;
    return await this.save();
  };

  // 实例方法：暂停工作
  WorkOrderMechanic.prototype.pauseWork = async function(reason) {
    this.status = 'paused';
    this.note = reason;
    return await this.save();
  };

  // 实例方法：技师完成工作
  WorkOrderMechanic.prototype.complete = async function(hoursWorked, note = null) {
    this.status = 'completed';
    this.hours_worked = hoursWorked;
    if (note) this.note = note;
    return await this.save();
  };

  // 实例方法：重置工作状态
  WorkOrderMechanic.prototype.resetStatus = async function() {
    this.status = 'not_started';
    return await this.save();
  };

  // 实例方法：更新工作时长
  WorkOrderMechanic.prototype.updateHours = async function(hoursWorked) {
    this.hours_worked = hoursWorked;
    return await this.save();
  };

  // 类方法：分配技师到工单
  WorkOrderMechanic.assign = async function(orderId, mechanicId, note = null) {
    // 检查是否已经分配
    const existing = await WorkOrderMechanic.findOne({
      where: { order_id: orderId, mechanic_id: mechanicId }
    });
    
    if (existing) {
      throw new Error('技师已经分配到该工单');
    }

    return await WorkOrderMechanic.create({
      order_id: orderId,
      mechanic_id: mechanicId,
      note: note,
      status: 'not_started'
    });
  };

  // 类方法：获取技师的工单列表
  WorkOrderMechanic.getMechanicWorkOrders = async function(mechanicId, status) {
    const where = { mechanic_id: mechanicId };
    if (status) where.status = status;

    return await WorkOrderMechanic.findAll({
      where,
      include: [{
        model: sequelize.models.WorkOrder,
        as: 'workOrder',
        include: [{
          model: sequelize.models.Vehicle,
          as: 'vehicle',
          include: [{
            model: sequelize.models.User,
            as: 'user',
            attributes: ['name']
          }]
        }]
      }],
      order: [['created_at', 'DESC']]
    });
  };

  // 类方法：获取工单的技师列表
  WorkOrderMechanic.getOrderMechanics = async function(orderId) {
    return await WorkOrderMechanic.findAll({
      where: { order_id: orderId },
      include: [{
        model: sequelize.models.MechanicProfile,
        as: 'mechanic',
        include: [{
          model: sequelize.models.User,
          as: 'user',
          attributes: ['name']
        }]
      }],
      order: [['created_at', 'ASC']]
    });
  };

  // 类方法：获取技师的工作统计
  WorkOrderMechanic.getMechanicStats = async function(mechanicId, startDate, endDate) {
    const whereClause = { mechanic_id: mechanicId };
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await WorkOrderMechanic.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('order_id')), 'total_orders'],
        [sequelize.fn('SUM', sequelize.col('hours_worked')), 'total_hours'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed_orders'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'in_progress' THEN 1 END")), 'in_progress_orders'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'paused' THEN 1 END")), 'paused_orders'],
        [sequelize.fn('AVG', sequelize.col('hours_worked')), 'average_hours_per_order']
      ],
      raw: true
    });
  };

  // 类方法：获取技师当前工作负载
  WorkOrderMechanic.getMechanicWorkload = async function(mechanicId) {
    return await WorkOrderMechanic.count({
      where: { 
        mechanic_id: mechanicId,
        status: ['in_progress', 'paused']
      }
    });
  };

  // 类方法：批量分配技师
  WorkOrderMechanic.batchAssign = async function(orderId, mechanicIds) {
    const assignments = mechanicIds.map(mechanicId => ({
      order_id: orderId,
      mechanic_id: mechanicId,
      status: 'not_started'
    }));
    
    return await WorkOrderMechanic.bulkCreate(assignments, {
      ignoreDuplicates: true
    });
  };

  // 类方法：移除技师分配
  WorkOrderMechanic.removeAssignment = async function(orderId, mechanicId) {
    return await WorkOrderMechanic.destroy({
      where: { order_id: orderId, mechanic_id: mechanicId }
    });
  };

  // 定义关联关系
  WorkOrderMechanic.associate = function(models) {
    // 工单技师关联属于一个工单
    WorkOrderMechanic.belongsTo(models.WorkOrder, {
      foreignKey: 'order_id',
      as: 'workOrder'
    });

    // 工单技师关联属于一个技师
    WorkOrderMechanic.belongsTo(models.MechanicProfile, {
      foreignKey: 'mechanic_id',
      as: 'mechanic'
    });
  };

  return WorkOrderMechanic;
}; 