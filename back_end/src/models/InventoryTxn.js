/**
 * 库存交易模型 - InventoryTxn Model
 * 
 * 功能说明：
 * - 记录配件的库存变动历史
 * - 支持入库、出库、调整三种类型
 * - 关联工单的配件出库记录
 * 
 * 数据表：INVENTORY_TXN
 * 主要字段：
 * - txn_id: BIGINT, 主键
 * - part_id: BIGINT, 外键->PART
 * - order_id: BIGINT, 外键->WorkOrder（可空，出库时使用）
 * - qty: INT, 数量（正负表示增减）
 * - type: ENUM('IN','OUT','ADJUST'), 交易类型
 * - created_at: DATETIME, 交易时间
 * 
 * 关联关系：
 * - 一个配件可以有多条库存交易记录
 * - 出库记录关联到具体的工单
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryTxn:
 *       type: object
 *       properties:
 *         txn_id:
 *           type: integer
 *           description: 交易记录唯一标识符
 *         part_id:
 *           type: integer
 *           description: 配件ID
 *         order_id:
 *           type: integer
 *           description: 工单ID（出库时关联）
 *         qty:
 *           type: integer
 *           description: 数量（正数为入库，负数为出库）
 *         type:
 *           type: string
 *           enum: [IN, OUT, ADJUST]
 *           description: 交易类型
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 交易时间
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryTxn = sequelize.define('InventoryTxn', {
    txn_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'txn_id'
    },
    part_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'part_id',
      references: {
        model: 'parts',
        key: 'part_id'
      }
    },
    order_id: {
      type: DataTypes.BIGINT,
      field: 'order_id',
      references: {
        model: 'work_orders',
        key: 'order_id'
      }
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'qty'
    },
    type: {
      type: DataTypes.ENUM('IN', 'OUT', 'ADJUST'),
      allowNull: false,
      field: 'type'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'inventory_txns',
    timestamps: false,
    indexes: [
      {
        fields: ['part_id']
      },
      {
        fields: ['order_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // 类方法：记录入库
  InventoryTxn.recordInbound = async function(partId, quantity, operatorId = null) {
    return await InventoryTxn.create({
      part_id: partId,
      qty: Math.abs(quantity), // 入库数量为正数
      type: 'IN'
    });
  };

  // 类方法：记录出库（用于工单）
  InventoryTxn.recordOutbound = async function(partId, quantity, orderId, operatorId = null) {
    // 检查库存是否充足
    const currentStock = await InventoryTxn.getCurrentStock(partId);
    if (currentStock < quantity) {
      throw new Error(`库存不足，当前库存：${currentStock}，需要：${quantity}`);
    }

    return await InventoryTxn.create({
      part_id: partId,
      order_id: orderId,
      qty: -Math.abs(quantity), // 出库数量为负数
      type: 'OUT'
    });
  };

  // 类方法：记录库存调整
  InventoryTxn.recordAdjustment = async function(partId, quantity, reason, operatorId = null) {
    return await InventoryTxn.create({
      part_id: partId,
      qty: quantity, // 调整数量可正可负
      type: 'ADJUST'
    });
  };

  // 类方法：获取配件当前库存
  InventoryTxn.getCurrentStock = async function(partId) {
    const result = await InventoryTxn.findAll({
      where: { part_id: partId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('qty')), 'total_qty']
      ],
      raw: true
    });
    return parseInt(result[0].total_qty) || 0;
  };

  // 类方法：获取配件库存历史
  InventoryTxn.getPartHistory = async function(partId, startDate, endDate) {
    const whereClause = { part_id: partId };
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await InventoryTxn.findAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.Part,
          as: 'part',
          attributes: ['name', 'unit']
        },
        {
          model: sequelize.models.WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });
  };

  // 类方法：获取工单的配件使用记录
  InventoryTxn.getOrderParts = async function(orderId) {
    return await InventoryTxn.findAll({
      where: { 
        order_id: orderId,
        type: 'OUT'
      },
      include: [{
        model: sequelize.models.Part,
        as: 'part',
        attributes: ['name', 'unit', 'unit_cost']
      }]
    });
  };

  // 类方法：获取库存变动报表
  InventoryTxn.getInventoryReport = async function(startDate, endDate) {
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await InventoryTxn.findAll({
      where: whereClause,
      include: [{
        model: sequelize.models.Part,
        as: 'part',
        attributes: ['name', 'unit']
      }],
      attributes: [
        'part_id',
        'type',
        [sequelize.fn('SUM', sequelize.col('qty')), 'total_qty'],
        [sequelize.fn('COUNT', sequelize.col('txn_id')), 'transaction_count']
      ],
      group: ['part_id', 'type'],
      order: [['part_id', 'ASC']]
    });
  };

  // 类方法：批量出库（用于工单）
  InventoryTxn.batchOutbound = async function(orderId, parts, operatorId = null) {
    const transactions = [];
    
    for (const part of parts) {
      const { partId, quantity } = part;
      
      // 检查库存
      const currentStock = await InventoryTxn.getCurrentStock(partId);
      if (currentStock < quantity) {
        throw new Error(`配件 ${partId} 库存不足，当前库存：${currentStock}，需要：${quantity}`);
      }
      
      transactions.push({
        part_id: partId,
        order_id: orderId,
        qty: -Math.abs(quantity),
        type: 'OUT'
      });
    }
    
    return await InventoryTxn.bulkCreate(transactions);
  };

  // 定义关联关系
  InventoryTxn.associate = function(models) {
    // 库存交易属于一个配件
    InventoryTxn.belongsTo(models.Part, {
      foreignKey: 'part_id',
      as: 'part'
    });

    // 库存交易可能关联一个工单
    InventoryTxn.belongsTo(models.WorkOrder, {
      foreignKey: 'order_id',
      as: 'workOrder'
    });
  };

  return InventoryTxn;
}; 