/**
 * 支付模型 - Payment Model
 * 
 * 功能说明：
 * - 管理工单的支付信息
 * - 记录人工费和配件费
 * - 跟踪支付状态和支付时间
 * 
 * 数据表：PAYMENT
 * 主要字段：
 * - payment_id: BIGINT, 主键
 * - order_id: BIGINT, 外键->WorkOrder（唯一）
 * - labor_fee: DECIMAL(10,2), 人工费
 * - material_fee: DECIMAL(10,2), 配件费
 * - total_fee: DECIMAL(10,2), 总费用
 * - paid_at: DATETIME, 支付时间（可空）
 * 
 * 关联关系：
 * - 一个工单对应一个支付记录
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         payment_id:
 *           type: integer
 *           description: 支付记录唯一标识符
 *         order_id:
 *           type: integer
 *           description: 工单ID
 *         labor_fee:
 *           type: number
 *           format: decimal
 *           description: 人工费用
 *         material_fee:
 *           type: number
 *           format: decimal
 *           description: 配件费用
 *         total_fee:
 *           type: number
 *           format: decimal
 *           description: 总费用
 *         paid_at:
 *           type: string
 *           format: date-time
 *           description: 支付时间
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    payment_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'payment_id'
    },
    order_id: {
      type: DataTypes.BIGINT,
      unique: true,
      allowNull: false,
      field: 'order_id',
      references: {
        model: 'work_orders',
        key: 'order_id'
      }
    },
    labor_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'labor_fee'
    },
    material_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'material_fee'
    },
    total_fee: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'total_fee'
    },
    paid_at: {
      type: DataTypes.DATE,
      field: 'paid_at'
    }
  }, {
    tableName: 'payments',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['order_id']
      },
      {
        fields: ['paid_at']
      }
    ],
    hooks: {
      beforeSave: (payment, options) => {
        // 自动计算总费用
        payment.total_fee = (parseFloat(payment.labor_fee) || 0) + (parseFloat(payment.material_fee) || 0);
      }
    }
  });

  // 实例方法：处理支付
  Payment.prototype.processPayment = async function() {
    this.paid_at = new Date();
    return await this.save();
  };

  // 实例方法：是否已支付
  Payment.prototype.isPaid = function() {
    return this.paid_at !== null;
  };

  // 实例方法：更新费用
  Payment.prototype.updateFees = async function(laborFee, materialFee) {
    this.labor_fee = laborFee || 0;
    this.material_fee = materialFee || 0;
    this.total_fee = (parseFloat(this.labor_fee) || 0) + (parseFloat(this.material_fee) || 0);
    return await this.save();
  };

  // 类方法：获取未支付的工单
  Payment.getUnpaidOrders = async function() {
    return await Payment.findAll({
      where: { paid_at: null },
      include: [{
        model: sequelize.models.WorkOrder,
        as: 'workOrder',
        include: [
          {
            model: sequelize.models.User,
            as: 'customer',
            attributes: ['name']
          },
          {
            model: sequelize.models.Vehicle,
            as: 'vehicle',
            attributes: ['plate_no', 'model']
          }
        ]
      }]
    });
  };

  // 类方法：获取收入统计
  Payment.getRevenueStats = async function(startDate, endDate) {
    const whereClause = {
      paid_at: { [sequelize.Sequelize.Op.not]: null }
    };
    
    if (startDate && endDate) {
      whereClause.paid_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await Payment.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('payment_id')), 'total_payments'],
        [sequelize.fn('SUM', sequelize.col('total_fee')), 'total_revenue'],
        [sequelize.fn('SUM', sequelize.col('labor_fee')), 'total_labor_fee'],
        [sequelize.fn('SUM', sequelize.col('material_fee')), 'total_material_fee'],
        [sequelize.fn('AVG', sequelize.col('total_fee')), 'average_payment']
      ],
      raw: true
    });
  };

  // 类方法：获取客户消费记录
  Payment.getCustomerPayments = async function(customerId) {
    return await Payment.findAll({
      include: [{
        model: sequelize.models.WorkOrder,
        as: 'workOrder',
        where: { customer_id: customerId },
        include: [{
          model: sequelize.models.Vehicle,
          as: 'vehicle',
          attributes: ['plate_no', 'model']
        }]
      }],
      order: [['paid_at', 'DESC']]
    });
  };

  // 类方法：获取用户的支付记录
  Payment.getUserPayments = async function(userId) {
    return await Payment.findAll({
      where: { user_id: userId },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['name']
      }],
      order: [['created_at', 'DESC']]
    });
  };

  // 定义关联关系
  Payment.associate = function(models) {
    // 支付属于一个工单
    Payment.belongsTo(models.WorkOrder, {
      foreignKey: 'order_id',
      as: 'workOrder'
    });
  };

  return Payment;
}; 