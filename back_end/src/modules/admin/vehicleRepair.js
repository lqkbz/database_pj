const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Vehicle, WorkOrder, User } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminVehicleRepair');

/**
 * @swagger
 * /api/admin/vehicle-repair:
 *   get:
 *     summary: 获取车辆维修统计报表
 *     description: 获取指定时间范围内的车辆维修统计数据
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         default: month
 *         description: 时间范围
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
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *         description: 车辆品牌
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
 *                     timeRange:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *                     totalRepairs:
 *                       type: number
 *                     vehicleCount:
 *                       type: number
 *                     averageRepairsPerVehicle:
 *                       type: number
 *                     repairsByMake:
 *                       type: array
 *                     repairsByVehicleAge:
 *                       type: array
 *                     mostCommonIssues:
 *                       type: array
 *                     repairTrend:
 *                       type: array
 *                     seasonalFactors:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getVehicleRepairStats = async (ctx) => {
  const { timeRange = 'month', startDate, endDate, make } = ctx.query;
  
  try {
    // 构建日期范围
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        created_at: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    } else {
      // 默认最近一个月
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      dateFilter = {
        created_at: {
          [Op.between]: [oneMonthAgo, now]
        }
      };
    }

    // 构建车辆查询条件
    let vehicleWhereClause = {};
    if (make) {
      vehicleWhereClause.make = { [Op.like]: `%${make}%` };
    }

    // 获取维修记录（已完成的工单）
    const repairOrders = await WorkOrder.findAll({
      where: {
        ...dateFilter,
        status: 'done'
      },
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          where: vehicleWhereClause,
          attributes: ['vehicle_id', 'make', 'model', 'year', 'plate_no'],
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['user_id', 'name']
            }
          ],
          required: true
        }
      ],
      attributes: ['order_id', 'description', 'created_at', 'finished_at']
    });

    // 基本统计
    const totalRepairs = repairOrders.length;
    
    // 统计涉及的车辆数量
    const uniqueVehicles = new Set(repairOrders.map(order => order.vehicle.vehicle_id));
    const vehicleCount = uniqueVehicles.size;
    
    const averageRepairsPerVehicle = vehicleCount > 0 ? (totalRepairs / vehicleCount) : 0;

    // 按品牌统计维修次数
    const makeStats = {};
    repairOrders.forEach(order => {
      const vehicleMake = order.vehicle.make;
      if (!makeStats[vehicleMake]) {
        makeStats[vehicleMake] = 0;
      }
      makeStats[vehicleMake]++;
    });

    const repairsByMake = Object.entries(makeStats)
      .map(([make, count]) => ({
        make,
        count,
        percentage: totalRepairs > 0 ? parseFloat((count / totalRepairs * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 按车龄统计维修次数
    const currentYear = new Date().getFullYear();
    const ageStats = {
      '0-3年': 0,
      '3-5年': 0,
      '5-8年': 0,
      '8年以上': 0
    };

    repairOrders.forEach(order => {
      const vehicleAge = currentYear - order.vehicle.year;
      let ageRange;
      
      if (vehicleAge <= 3) {
        ageRange = '0-3年';
      } else if (vehicleAge <= 5) {
        ageRange = '3-5年';
      } else if (vehicleAge <= 8) {
        ageRange = '5-8年';
      } else {
        ageRange = '8年以上';
      }
      
      ageStats[ageRange]++;
    });

    const repairsByVehicleAge = Object.entries(ageStats).map(([ageRange, count]) => ({
      ageRange,
      count,
      percentage: totalRepairs > 0 ? parseFloat((count / totalRepairs * 100).toFixed(2)) : 0
    }));

    // 分析常见故障（基于工单描述）
    const issueStats = {};
    repairOrders.forEach(order => {
      const description = order.description.toLowerCase();
      let issue = '其他维修';
      
      if (description.includes('机油') || description.includes('滤清器') || description.includes('保养')) {
        issue = '更换机油和滤清器';
      } else if (description.includes('刹车') || description.includes('制动')) {
        issue = '刹车系统维修';
      } else if (description.includes('发动机') || description.includes('引擎')) {
        issue = '发动机故障检修';
      } else if (description.includes('空调') || description.includes('制冷')) {
        issue = '空调系统维修';
      } else if (description.includes('变速箱')) {
        issue = '变速箱维修';
      } else if (description.includes('电子') || description.includes('电路')) {
        issue = '电子系统故障';
      } else if (description.includes('轮胎')) {
        issue = '轮胎更换';
      }
      
      if (!issueStats[issue]) {
        issueStats[issue] = 0;
      }
      issueStats[issue]++;
    });

    const mostCommonIssues = Object.entries(issueStats)
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: totalRepairs > 0 ? parseFloat((count / totalRepairs * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 维修趋势分析（按月统计）
    const monthlyRepairs = {};
    repairOrders.forEach(order => {
      const monthKey = new Date(order.created_at).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyRepairs[monthKey]) {
        monthlyRepairs[monthKey] = 0;
      }
      monthlyRepairs[monthKey]++;
    });

    const repairTrend = Object.entries(monthlyRepairs)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('zh-CN', { month: 'long' }),
        count
      }));

    // 季节性因素分析
    const seasonalStats = {
      winter: { count: 0, issues: {} },  // 12, 1, 2月
      spring: { count: 0, issues: {} },  // 3, 4, 5月
      summer: { count: 0, issues: {} },  // 6, 7, 8月
      autumn: { count: 0, issues: {} }   // 9, 10, 11月
    };

    repairOrders.forEach(order => {
      const month = new Date(order.created_at).getMonth() + 1;
      let season;
      
      if (month === 12 || month <= 2) {
        season = 'winter';
      } else if (month <= 5) {
        season = 'spring';
      } else if (month <= 8) {
        season = 'summer';
      } else {
        season = 'autumn';
      }
      
      seasonalStats[season].count++;
      
      // 分析季节性故障
      const description = order.description.toLowerCase();
      let seasonalIssue = '其他';
      
      if (description.includes('电池') || description.includes('启动')) {
        seasonalIssue = '电池故障';
      } else if (description.includes('空调') || description.includes('制冷')) {
        seasonalIssue = '空调系统';
      } else if (description.includes('暖风') || description.includes('加热')) {
        seasonalIssue = '暖风系统';
      } else if (description.includes('雨刮') || description.includes('雨刷')) {
        seasonalIssue = '雨刮器';
      } else if (description.includes('冷却') || description.includes('散热')) {
        seasonalIssue = '冷却系统';
      } else if (description.includes('照明') || description.includes('灯')) {
        seasonalIssue = '照明系统';
      }
      
      if (!seasonalStats[season].issues[seasonalIssue]) {
        seasonalStats[season].issues[seasonalIssue] = 0;
      }
      seasonalStats[season].issues[seasonalIssue]++;
    });

    const seasonalFactors = {};
    Object.entries(seasonalStats).forEach(([season, stats]) => {
      const seasonNames = {
        winter: '冬季',
        spring: '春季', 
        summer: '夏季',
        autumn: '秋季'
      };
      
      const topIssues = Object.entries(stats.issues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([issue]) => issue);
      
      seasonalFactors[seasonNames[season]] = {
        percentage: totalRepairs > 0 ? parseFloat((stats.count / totalRepairs * 100).toFixed(2)) : 0,
        commonIssues: topIssues
      };
    });

    // 车辆维修频率统计
    const vehicleRepairStats = {
      timeRange,
      startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      totalRepairs,
      vehicleCount,
      averageRepairsPerVehicle: parseFloat(averageRepairsPerVehicle.toFixed(2)),
      repairsByMake,
      repairsByVehicleAge,
      mostCommonIssues,
      repairTrend,
      seasonalFactors
    };
    
    logger.info(`管理员查询了车辆维修统计报表`);
    
    ctx.body = {
      status: 'success',
      data: vehicleRepairStats
    };
  } catch (error) {
    logger.error('获取车辆维修统计失败:', error);
    throw createError.internal('获取车辆维修统计失败');
  }
};

module.exports = {
  getVehicleRepairStats
};
