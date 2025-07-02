const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Feedback, WorkOrder, User, Vehicle } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminFeedback');

/**
 * @swagger
 * /api/admin/feedback:
 *   get:
 *     summary: 获取反馈列表
 *     description: 获取系统中的反馈记录，支持按类型、状态、日期等过滤
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *         description: 每页记录数
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [rating, urge, advice, complaint]
 *         description: 反馈类型
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: 评分等级（仅对rating类型有效）
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: 客户ID或姓名
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedback:
 *                       type: array
 *                       items:
 *                         type: object
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         averageRating:
 *                           type: number
 *                         totalCount:
 *                           type: integer
 *                         ratingCount:
 *                           type: integer
 *                         urgeCount:
 *                           type: integer
 *                         adviceCount:
 *                           type: integer
 *                         complaintCount:
 *                           type: integer
 *                         ratingDistribution:
 *                           type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getFeedbackList = async (ctx) => {
  const { page = 1, limit = 10, type, rating, customer, startDate, endDate } = ctx.query;
  
  try {
    // 构建查询条件
    const whereClause = {};
    const userWhereClause = {};
    
    if (type) {
      whereClause.type = type;
    }
    
    if (rating && type === 'rating') {
      whereClause.rating = rating;
    }
    
    if (customer) {
      if (isNaN(customer)) {
        userWhereClause.name = { [Op.like]: `%${customer}%` };
      } else {
        whereClause.user_id = customer;
      }
    }
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.created_at = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.created_at = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // 查询反馈记录
    const { count, rows: feedbacks } = await Feedback.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'customer',
          where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined,
          attributes: ['user_id', 'name'],
          required: true
        },
        {
          model: WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description'],
          include: [
            {
              model: Vehicle,
              as: 'vehicle',
              attributes: ['plate_no']
            }
          ],
          required: false
        }
      ],
      attributes: ['feedback_id', 'type', 'rating', 'comment', 'reply', 'created_at'],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    // 处理数据
    const processedFeedbacks = feedbacks.map(feedback => ({
      id: feedback.feedback_id,
      type: feedback.type,
      rating: feedback.rating,
      comment: feedback.comment,
      reply: feedback.reply,
      createdAt: feedback.created_at,
      customer: {
        id: feedback.customer.user_id,
        name: feedback.customer.name
      },
      workOrder: feedback.workOrder ? {
        id: feedback.workOrder.order_id,
        description: feedback.workOrder.description,
        vehiclePlate: feedback.workOrder.vehicle?.plate_no
      } : null
    }));

    // 计算统计信息
    const allFeedbacks = await Feedback.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'customer',
          where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined,
          attributes: [],
          required: true
        }
      ],
      attributes: ['type', 'rating']
    });

    const ratingFeedbacks = allFeedbacks.filter(f => f.type === 'rating' && f.rating);
    const averageRating = ratingFeedbacks.length > 0 
      ? ratingFeedbacks.reduce((sum, f) => sum + f.rating, 0) / ratingFeedbacks.length 
      : 0;

    const ratingDistribution = [1, 2, 3, 4, 5].reduce((dist, level) => {
      dist[level] = ratingFeedbacks.filter(f => f.rating === level).length;
      return dist;
    }, {});

    const statistics = {
      averageRating: parseFloat(averageRating.toFixed(2)),
      totalCount: allFeedbacks.length,
      ratingCount: allFeedbacks.filter(f => f.type === 'rating').length,
      urgeCount: allFeedbacks.filter(f => f.type === 'urge').length,
      adviceCount: allFeedbacks.filter(f => f.type === 'advice').length,
      complaintCount: allFeedbacks.filter(f => f.type === 'complaint').length,
      ratingDistribution
    };
    
    logger.info(`管理员查询了反馈列表，返回 ${feedbacks.length} 条记录`);
    
    ctx.body = {
      status: 'success',
      data: {
        feedback: processedFeedbacks,
        statistics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取反馈列表失败:', error);
    throw createError.internal('获取反馈列表失败');
  }
};

/**
 * @swagger
 * /api/admin/feedback/{id}:
 *   patch:
 *     summary: 回复反馈
 *     description: 管理员对客户反馈进行回复
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 反馈ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *                 description: 回复内容
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedbackId:
 *                       type: string
 *                     reply:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 反馈不存在
 *       500:
 *         description: 服务器错误
 */
const replyToFeedback = async (ctx) => {
  const feedbackId = ctx.params.id;
  const { reply } = ctx.request.body;
  
  try {
    // 验证输入
    if (!reply || reply.trim().length === 0) {
      throw createError.validation('回复内容不能为空');
    }
    
    // 获取反馈记录
    const feedback = await Feedback.findByPk(feedbackId);
    
    if (!feedback) {
      throw createError.notFound('反馈不存在');
    }
    
    // 检查是否已经回复过
    if (feedback.reply) {
      throw createError.conflict('该反馈已经回复过了');
    }
    
    // 更新反馈记录
    await feedback.update({
      reply: reply.trim()
    });
    
    logger.info(`管理员回复了反馈 ${feedbackId}`);
    
    ctx.body = {
      status: 'success',
      message: '反馈回复成功',
      data: {
        feedbackId,
        reply: reply.trim()
      }
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`回复反馈失败 (ID: ${feedbackId}):`, error);
    throw createError.internal('回复反馈失败');
  }
};

/**
 * @swagger
 * /api/admin/feedback/{id}:
 *   delete:
 *     summary: 删除反馈
 *     description: 管理员删除不合适的反馈记录
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 反馈ID
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *       401:
 *         description: 未授权
 *       404:
 *         description: 反馈不存在
 *       500:
 *         description: 服务器错误
 */
const deleteFeedback = async (ctx) => {
  const feedbackId = ctx.params.id;
  
  try {
    // 获取反馈记录
    const feedback = await Feedback.findByPk(feedbackId);
    
    if (!feedback) {
      throw createError.notFound('反馈不存在');
    }
    
    // 删除反馈记录
    await feedback.destroy();
    
    logger.info(`管理员删除了反馈 ${feedbackId}`);
    
    ctx.body = {
      status: 'success',
      message: '反馈已删除'
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`删除反馈失败 (ID: ${feedbackId}):`, error);
    throw createError.internal('删除反馈失败');
  }
};

module.exports = {
  getFeedbackList,
  replyToFeedback,
  deleteFeedback
};
