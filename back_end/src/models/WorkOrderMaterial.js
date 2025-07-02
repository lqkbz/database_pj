/**
 * 工单配件关联模型 - WorkOrderMaterial Model
 * 
 * 功能说明：
 * - 管理工单与配件的多对多关系
 * - 记录工单中使用的配件数量和价格
 * - 跟踪配件的使用情况和成本
 * 
 * 数据表：WORKORDER_MATERIAL
 * 主要字段：
 * - order_id: BIGINT, 外键->WorkOrder（复合主键）
 * - part_id: BIGINT, 外键->Part（复合主键）
 * - qty: INT, 使用数量
 * - price: DECIMAL(10,2), 单价
 * 
 * 关联关系：
 * - 一个工单可以使用多种配件
 * - 一种配件可以用于多个工单
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkOrderMaterial:
 *       type: object
 *       properties:
 *         order_id:
 *           type: integer
 *           description: 工单ID
 *         part_id:
 *           type: integer
 *           description: 配件ID
 *         qty:
 *           type: integer
 *           description: 使用数量
 *         price:
 *           type: number
 *           format: decimal
 *           description: 配件单价
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkOrderMaterial = sequelize.define('WorkOrderMaterial', {
    order_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      field: 'order_id',
      references: {
        model: 'work_orders',
        key: 'order_id'
      }
    },
    part_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      field: 'part_id',
      references: {
        model: 'parts',
        key: 'part_id'
      }
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'qty'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price'
    }
  }, {
    tableName: 'work_order_materials',
    timestamps: false,
    indexes: [
      {
        fields: ['part_id']
      }
    ]
  });

  // 实例方法：计算总成本
  WorkOrderMaterial.prototype.getTotalCost = function() {
    return parseFloat(this.qty) * parseFloat(this.price);
  };

  // 实例方法：更新数量
  WorkOrderMaterial.prototype.updateQuantity = async function(newQuantity) {
    // 检查库存是否充足
    const models = sequelize.models;
    const currentStock = await models.InventoryTxn.getCurrentStock(this.part_id);
    const stockDifference = newQuantity - this.qty;
    
    if (stockDifference > 0 && currentStock < stockDifference) {
      throw new Error(`库存不足，当前库存：${currentStock}，需要额外：${stockDifference}`);
    }

    // 更新库存记录
    if (stockDifference !== 0) {
      await models.InventoryTxn.create({
        part_id: this.part_id,
        order_id: this.order_id,
        qty: -stockDifference, // 出库为负数
        type: 'OUT'
      });
    }

    this.qty = newQuantity;
    return await this.save();
  };

  // 类方法：添加配件到工单
  WorkOrderMaterial.addMaterial = async function(orderId, partId, quantity, price) {
    // 检查库存是否充足
    const models = sequelize.models;
    const currentStock = await models.InventoryTxn.getCurrentStock(partId);
    
    if (currentStock < quantity) {
      throw new Error(`库存不足，当前库存：${currentStock}，需要：${quantity}`);
    }

    // 检查是否已经添加过该配件
    const existing = await WorkOrderMaterial.findOne({
      where: { order_id: orderId, part_id: partId }
    });
    
    if (existing) {
      // 如果已存在，则更新数量
      return await existing.updateQuantity(existing.qty + quantity);
    }

    // 创建工单配件记录
    const workOrderMaterial = await WorkOrderMaterial.create({
      order_id: orderId,
      part_id: partId,
      qty: quantity,
      price: price
    });

    // 创建库存出库记录
    await models.InventoryTxn.recordOutbound(partId, quantity, orderId);

    return workOrderMaterial;
  };

  // 类方法：移除配件
  WorkOrderMaterial.removeMaterial = async function(orderId, partId) {
    const material = await WorkOrderMaterial.findOne({
      where: { order_id: orderId, part_id: partId }
    });
    
    if (!material) {
      throw new Error('配件记录不存在');
    }

    // 恢复库存
    const models = sequelize.models;
    await models.InventoryTxn.create({
      part_id: partId,
      order_id: orderId,
      qty: material.qty, // 恢复库存为正数
      type: 'ADJUST'
    });

    return await material.destroy();
  };

  // 类方法：获取工单的所有配件
  WorkOrderMaterial.getOrderMaterials = async function(orderId) {
    return await WorkOrderMaterial.findAll({
      where: { order_id: orderId },
      include: [{
        model: sequelize.models.Part,
        as: 'part',
        attributes: ['name', 'unit', 'unit_cost']
      }]
    });
  };

  // 类方法：获取配件的使用历史
  WorkOrderMaterial.getPartUsageHistory = async function(partId, startDate, endDate) {
    const whereClause = { part_id: partId };
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await WorkOrderMaterial.findAll({
      where: whereClause,
      include: [{
        model: sequelize.models.WorkOrder,
        as: 'workOrder',
        attributes: ['order_id', 'description', 'created_at'],
        include: [{
          model: sequelize.models.Vehicle,
          as: 'vehicle',
          attributes: ['plate_no', 'model']
        }]
      }],
      order: [['workOrder', 'created_at', 'DESC']]
    });
  };

  // 类方法：计算工单的配件总成本
  WorkOrderMaterial.calculateMaterialCost = async function(orderId) {
    const result = await WorkOrderMaterial.findAll({
      where: { order_id: orderId },
      attributes: [
        [sequelize.fn('SUM', sequelize.literal('qty * price')), 'total_cost']
      ],
      raw: true
    });
    return parseFloat(result[0].total_cost) || 0;
  };

  // 类方法：批量添加配件
  WorkOrderMaterial.batchAddMaterials = async function(orderId, materials) {
    const models = sequelize.models;
    const createdMaterials = [];
    
    for (const material of materials) {
      const { partId, quantity, price } = material;
      
      // 检查库存
      const currentStock = await models.InventoryTxn.getCurrentStock(partId);
      if (currentStock < quantity) {
        throw new Error(`配件 ${partId} 库存不足，当前库存：${currentStock}，需要：${quantity}`);
      }
      
      // 创建工单配件记录
      const workOrderMaterial = await WorkOrderMaterial.create({
        order_id: orderId,
        part_id: partId,
        qty: quantity,
        price: price
      });
      
      createdMaterials.push(workOrderMaterial);
    }
    
    // 批量创建库存出库记录
    const inventoryTxns = materials.map(material => ({
      part_id: material.partId,
      order_id: orderId,
      qty: -material.quantity,
      type: 'OUT'
    }));
    
    await models.InventoryTxn.bulkCreate(inventoryTxns);
    
    return createdMaterials;
  };

  // 类方法：获取最常用配件
  WorkOrderMaterial.getMostUsedParts = async function(limit = 10, startDate, endDate) {
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await WorkOrderMaterial.findAll({
      where: whereClause,
      include: [{
        model: sequelize.models.Part,
        as: 'part',
        attributes: ['name', 'unit']
      }],
      attributes: [
        'part_id',
        [sequelize.fn('SUM', sequelize.col('qty')), 'total_used'],
        [sequelize.fn('COUNT', sequelize.col('order_id')), 'usage_count']
      ],
      group: ['part_id'],
      order: [[sequelize.literal('total_used'), 'DESC']],
      limit: limit
    });
  };

  // 定义关联关系
  WorkOrderMaterial.associate = function(models) {
    // 工单配件关联属于一个工单
    WorkOrderMaterial.belongsTo(models.WorkOrder, {
      foreignKey: 'order_id',
      as: 'workOrder'
    });

    // 工单配件关联属于一个配件
    WorkOrderMaterial.belongsTo(models.Part, {
      foreignKey: 'part_id',
      as: 'part'
    });
  };

  return WorkOrderMaterial;
}; 