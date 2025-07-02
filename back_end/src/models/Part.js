/**
 * 配件模型 - Part Model
 * 
 * 功能说明：
 * - 管理维修配件的基本信息
 * - 跟踪配件的库存和价格
 * - 记录配件的使用情况
 * 
 * 数据表：PART
 * 主要字段：
 * - part_id: BIGINT, 主键
 * - name: VARCHAR, 配件名称
 * - unit: ENUM('pcs','L','kg'), 计量单位
 * - unit_cost: DECIMAL(10,2), 单位成本
 * - qty: INT, 库存数量
 * 
 * 关联关系：
 * - 一个配件可以用于多个工单
 * - 一个配件可以有多条库存交易记录
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Part:
 *       type: object
 *       properties:
 *         part_id:
 *           type: integer
 *           description: 配件唯一标识符
 *         name:
 *           type: string
 *           description: 配件名称
 *         unit:
 *           type: string
 *           enum: [pcs, L, kg]
 *           description: 计量单位
 *         unit_cost:
 *           type: number
 *           format: decimal
 *           description: 单位成本
 *         qty:
 *           type: integer
 *           description: 库存数量
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Part = sequelize.define('Part', {
    part_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'part_id'
    },
    name: {
      type: DataTypes.STRING,
      field: 'name'
    },
    unit: {
      type: DataTypes.ENUM('pcs', 'L', 'kg'),
      field: 'unit'
    },
    unit_cost: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'unit_cost'
    },
    qty: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'qty'
    }
  }, {
    tableName: 'parts',
    timestamps: false,
    indexes: [
      {
        fields: ['name']
      }
    ]
  });

  // 实例方法：获取当前库存（从qty字段）
  Part.prototype.getCurrentStock = function() {
    return this.qty || 0;
  };

  // 实例方法：更新库存数量
  Part.prototype.updateStock = async function(quantity) {
    this.qty = quantity;
    return await this.save();
  };

  // 实例方法：增加库存
  Part.prototype.addStock = async function(quantity) {
    this.qty = (this.qty || 0) + quantity;
    return await this.save();
  };

  // 实例方法：减少库存
  Part.prototype.reduceStock = async function(quantity) {
    if ((this.qty || 0) < quantity) {
      throw new Error(`库存不足，当前库存：${this.qty}，需要：${quantity}`);
    }
    this.qty = (this.qty || 0) - quantity;
    return await this.save();
  };

  // 实例方法：获取使用历史
  Part.prototype.getUsageHistory = async function(startDate, endDate) {
    const models = sequelize.models;
    return await models.WorkOrderMaterial.findAll({
      where: {
        part_id: this.part_id,
        ...(startDate && endDate && {
          created_at: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
          }
        })
      },
      include: [{
        model: models.WorkOrder,
        as: 'workOrder',
        attributes: ['order_id', 'description', 'created_at']
      }],
      order: [['created_at', 'DESC']]
    });
  };

  // 实例方法：获取库存交易历史
  Part.prototype.getInventoryHistory = async function(startDate, endDate) {
    const models = sequelize.models;
    return await models.InventoryTxn.findAll({
      where: {
        part_id: this.part_id,
        ...(startDate && endDate && {
          created_at: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
          }
        })
      },
      order: [['created_at', 'DESC']]
    });
  };

  // 类方法：搜索配件
  Part.search = async function(keyword) {
    return await Part.findAll({
      where: {
        name: {
          [sequelize.Sequelize.Op.like]: `%${keyword}%`
        }
      }
    });
  };

  // 类方法：获取库存不足的配件
  Part.getLowStockParts = async function(threshold = 10) {
    return await Part.findAll({
      where: {
        qty: {
          [sequelize.Sequelize.Op.lt]: threshold
        }
      }
    });
  };

  // 定义关联关系
  Part.associate = function(models) {
    // 配件有多个库存交易记录
    Part.hasMany(models.InventoryTxn, {
      foreignKey: 'part_id',
      as: 'inventoryTransactions'
    });

    // 配件用于多个工单
    Part.hasMany(models.WorkOrderMaterial, {
      foreignKey: 'part_id',
      as: 'workOrderMaterials'
    });
  };

  return Part;
}; 