const { createLogger } = require('../../../middleware/logger');

const logger = createLogger('AdminReports');

/**
 * 获取负面反馈分析报表
 * 
 * @param {Object} ctx - Koa上下文
 */
const getNegativeFeedbackStats = async (ctx) => {
  const { timeRange = 'month', startDate, endDate, minRating = 3 } = ctx.query;
  
  // 构建查询条件
  const query = { 
    timeRange,
    minRating: parseInt(minRating)
  };
  
  if (startDate) {
    query.startDate = startDate;
  }
  
  if (endDate) {
    query.endDate = endDate;
  }
  
  // 从数据库获取统计数据
  // 实际项目中替换为数据库聚合查询
  
  // 负面反馈分析
  const negativeFeedbackStats = {
    timeRange: query.timeRange,
    startDate: query.startDate || '2023-01-01',
    endDate: query.endDate || '2023-05-31',
    totalFeedback: 186,
    negativeFeedbackCount: 28,
    negativeFeedbackRate: 15.05,
    averageRating: 4.2,
    ratingDistribution: [
      { rating: 1, count: 5, percentage: 2.69 },
      { rating: 2, count: 8, percentage: 4.30 },
      { rating: 3, count: 15, percentage: 8.06 },
      { rating: 4, count: 76, percentage: 40.86 },
      { rating: 5, count: 82, percentage: 44.09 }
    ],
    commonIssues: [
      { issue: '维修时间过长', count: 12, percentage: 42.86 },
      { issue: '服务态度不佳', count: 8, percentage: 28.57 },
      { issue: '维修质量问题', count: 5, percentage: 17.86 },
      { issue: '价格过高', count: 3, percentage: 10.71 }
    ],
    mechanicPerformance: [
      { mechanicId: 'mech2', name: '王师傅', totalOrders: 42, negativeCount: 8, negativeRate: 19.05 },
      { mechanicId: 'mech5', name: '刘师傅', totalOrders: 35, negativeCount: 6, negativeRate: 17.14 },
      { mechanicId: 'mech1', name: '李师傅', totalOrders: 55, negativeCount: 5, negativeRate: 9.09 },
      { mechanicId: 'mech3', name: '张师傅', totalOrders: 38, negativeCount: 3, negativeRate: 7.89 },
      { mechanicId: 'mech4', name: '赵师傅', totalOrders: 16, negativeCount: 1, negativeRate: 6.25 }
    ],
    serviceTypeIssues: [
      { serviceType: '发动机维修', totalOrders: 43, negativeCount: 9, negativeRate: 20.93 },
      { serviceType: '变速箱维修', totalOrders: 21, negativeCount: 4, negativeRate: 19.05 },
      { serviceType: '电子系统', totalOrders: 38, negativeCount: 6, negativeRate: 15.79 },
      { serviceType: '常规保养', totalOrders: 68, negativeCount: 5, negativeRate: 7.35 },
      { serviceType: '轮胎更换', totalOrders: 16, negativeCount: 1, negativeRate: 6.25 }
    ],
    feedbackTrend: [
      { month: '1月', totalCount: 32, negativeCount: 6, negativeRate: 18.75 },
      { month: '2月', totalCount: 35, negativeCount: 7, negativeRate: 20.00 },
      { month: '3月', totalCount: 38, negativeCount: 6, negativeRate: 15.79 },
      { month: '4月', totalCount: 40, negativeCount: 5, negativeRate: 12.50 },
      { month: '5月', totalCount: 41, negativeCount: 4, negativeRate: 9.76 }
    ],
    recentNegativeFeedback: [
      {
        workOrderId: 'wo45',
        date: '2023-05-18T09:45:00Z',
        customer: '王五',
        rating: 2,
        comment: '等待时间太长，比约定的时间晚了2小时完成',
        mechanic: '王师傅',
        serviceType: '发动机维修'
      },
      {
        workOrderId: 'wo39',
        date: '2023-05-10T14:20:00Z',
        customer: '张三',
        rating: 1,
        comment: '维修后问题依然存在，需要返修',
        mechanic: '刘师傅',
        serviceType: '电子系统'
      },
      {
        workOrderId: 'wo32',
        date: '2023-04-28T16:15:00Z',
        customer: '李四',
        rating: 2,
        comment: '价格比预估高出很多，没有事先沟通',
        mechanic: '王师傅',
        serviceType: '变速箱维修'
      }
    ]
  };
  
  logger.info(`管理员查询了负面反馈分析报表`);
  
  ctx.body = {
    status: 'success',
    data: negativeFeedbackStats
  };
};

module.exports = {
  getNegativeFeedbackStats
};
