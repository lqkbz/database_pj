/**
 * 反馈模型 - Feedback Model
 * 
 * 功能说明：
 * - 管理客户对维修服务的反馈
 * - 支持评分和催单两种类型
 * - 记录客户的评价和建议
 * 
 * 数据表：FEEDBACK
 * 主要字段：
 * - feedback_id: BIGINT, 主键
 * - order_id: BIGINT, 外键->WorkOrder
 * - user_id: BIGINT, 外键->USER（反馈人）
 * - type: ENUM('rating','urge'), 反馈类型
 * - rating: INT, 评分（可空）
 * - comment: TEXT, 评价内容
 * - created_at: DATETIME, 创建时间
 * 
 * 关联关系：
 * - 一个工单可以有多个反馈
 * - 一个用户可以提交多个反馈
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       properties:
 *         feedback_id:
 *           type: integer
 *           description: 反馈唯一标识符
 *         order_id:
 *           type: integer
 *           description: 工单ID
 *         user_id:
 *           type: integer
 *           description: 用户ID
 *         type:
 *           type: string
 *           enum: [rating, urge]
 *           description: 反馈类型
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: 评分（1-5星）
 *         comment:
 *           type: string
 *           description: 评价内容
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Feedback = sequelize.define('Feedback', {
    feedback_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'feedback_id'
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'order_id',
      references: {
        model: 'work_orders',
        key: 'order_id'
      }
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
    type: {
      type: DataTypes.ENUM('rating', 'urge'),
      allowNull: false,
      field: 'type'
    },
    rating: {
      type: DataTypes.INTEGER,
      field: 'rating',
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT,
      field: 'comment'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'feedbacks',
    timestamps: false,
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // 类方法：提交评分反馈
  Feedback.submitRating = async function(orderId, userId, rating, comment, isAnonymous = false) {
    // 验证评分范围
    if (rating < 1 || rating > 5) {
      throw new Error('评分必须在1-5之间');
    }

    return await Feedback.create({
      order_id: orderId,
      user_id: userId,
      type: 'rating',
      rating: rating,
      comment: comment
    });
  };

  // 类方法：提交催单反馈
  Feedback.submitUrge = async function(orderId, userId, comment) {
    return await Feedback.create({
      order_id: orderId,
      user_id: userId,
      type: 'urge',
      comment: comment
    });
  };

  // 类方法：获取工单的所有反馈
  Feedback.getOrderFeedbacks = async function(orderId) {
    return await Feedback.findAll({
      where: { order_id: orderId },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['name']
      }],
      order: [['created_at', 'DESC']]
    });
  };

  // 类方法：获取用户的反馈历史
  Feedback.getUserFeedbacks = async function(userId) {
    return await Feedback.findAll({
      where: { user_id: userId },
      include: [{
        model: sequelize.models.WorkOrder,
        as: 'workOrder',
        attributes: ['order_id', 'description'],
        include: [{
          model: sequelize.models.Vehicle,
          as: 'vehicle',
          attributes: ['plate_no', 'model']
        }]
      }],
      order: [['created_at', 'DESC']]
    });
  };

  // 类方法：获取评分统计
  Feedback.getRatingStats = async function(startDate, endDate) {
    const whereClause = { type: 'rating' };
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    return await Feedback.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('feedback_id')), 'total_ratings'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN rating = 5 THEN 1 END")), 'five_star'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN rating = 4 THEN 1 END")), 'four_star'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN rating = 3 THEN 1 END")), 'three_star'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN rating = 2 THEN 1 END")), 'two_star'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN rating = 1 THEN 1 END")), 'one_star']
      ],
      raw: true
    });
  };

  // 类方法：获取催单列表
  Feedback.getUrgeList = async function() {
    return await Feedback.findAll({
      where: { type: 'urge' },
      include: [
        {
          model: sequelize.models.WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description', 'status'],
          include: [{
            model: sequelize.models.Vehicle,
            as: 'vehicle',
            attributes: ['plate_no', 'model']
          }]
        },
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['name']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  };

  // 类方法：获取最新反馈
  Feedback.getRecentFeedbacks = async function(limit = 10) {
    return await Feedback.findAll({
      include: [
        {
          model: sequelize.models.WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description']
        },
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limit
    });
  };

  // 定义关联关系
  Feedback.associate = function(models) {
    // 反馈属于一个工单
    Feedback.belongsTo(models.WorkOrder, {
      foreignKey: 'order_id',
      as: 'workOrder'
    });

    // 反馈属于一个用户
    Feedback.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return Feedback;
}; 