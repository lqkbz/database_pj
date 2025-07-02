const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { WorkOrder, WorkOrderMaterial, WorkOrderMechanic, Payment, Part, MechanicProfile, User } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminCostStructure');

/**
 * @swagger
 * /api/admin/cost-structure:
 *   get:
 *     summary: 获取成本结构分析报表
 *     description: 获取指定时间范围内的成本结构分析统计数据
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
 *                     totalRevenue:
 *                       type: number
 *                     totalCost:
 *                       type: number
 *                     grossProfit:
 *                       type: number
 *                     grossMargin:
 *                       type: number
 *                     costBreakdown:
 *                       type: object
 *                     laborCostByTrade:
 *                       type: array
 *                     materialCostByCategory:
 *                       type: array
 *                     costTrend:
 *                       type: array
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getCostStructureStats = async (ctx) => {
  const { timeRange = 'month', startDate, endDate } = ctx.query;
  
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

    // 获取已完成的工单及相关数据
    const completedOrders = await WorkOrder.findAll({
      where: {
        ...dateFilter,
        status: 'done'
      },
      include: [
        {
          model: WorkOrderMaterial,
          as: 'materials',
          include: [
            {
              model: Part,
              as: 'part',
              attributes: ['name', 'unit']
            }
          ]
        },
        {
          model: WorkOrderMechanic,
          as: 'mechanics',
          include: [
            {
              model: MechanicProfile,
              as: 'mechanic',
              attributes: ['trade', 'hourly_rate']
            }
          ]
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['amount', 'status']
        }
      ],
      attributes: ['order_id', 'created_at', 'description']
    });

    // 计算总收入
    const totalRevenue = completedOrders.reduce((sum, order) => {
      if (order.payment && order.payment.status === 'completed') {
        return sum + parseFloat(order.payment.amount);
      }
      return sum;
    }, 0);

    // 计算材料成本
    let totalMaterialCost = 0;
    const materialCostByCategory = {};
    
    completedOrders.forEach(order => {
      order.materials.forEach(material => {
        const materialCost = parseFloat(material.price) * material.qty;
        totalMaterialCost += materialCost;
        
        // 按配件名称分类（简化版，实际可能需要更复杂的分类逻辑）
        const category = material.part.name.includes('机油') ? '润滑油' :
                        material.part.name.includes('滤') ? '滤清器' :
                        material.part.name.includes('刹车') ? '刹车系统' :
                        material.part.name.includes('火花塞') ? '点火系统' : '其他';
        
        if (!materialCostByCategory[category]) {
          materialCostByCategory[category] = 0;
        }
        materialCostByCategory[category] += materialCost;
      });
    });

    // 计算人工成本
    let totalLaborCost = 0;
    const laborCostByTrade = {};
    
    completedOrders.forEach(order => {
      order.mechanics.forEach(mechanic => {
        const laborCost = parseFloat(mechanic.hours_worked || 0) * parseFloat(mechanic.mechanic.hourly_rate || 0);
        totalLaborCost += laborCost;
        
        const trade = mechanic.mechanic.trade || 'general';
        if (!laborCostByTrade[trade]) {
          laborCostByTrade[trade] = 0;
        }
        laborCostByTrade[trade] += laborCost;
      });
    });

    // 假设其他开销为总成本的10%（实际项目中可能从配置或其他表获取）
    const overheadCost = (totalMaterialCost + totalLaborCost) * 0.1;
    const totalCost = totalMaterialCost + totalLaborCost + overheadCost;
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

    // 成本分解
    const costBreakdown = {
      labor: {
        amount: parseFloat(totalLaborCost.toFixed(2)),
        percentage: totalCost > 0 ? parseFloat((totalLaborCost / totalCost * 100).toFixed(2)) : 0
      },
      materials: {
        amount: parseFloat(totalMaterialCost.toFixed(2)),
        percentage: totalCost > 0 ? parseFloat((totalMaterialCost / totalCost * 100).toFixed(2)) : 0
      },
      overhead: {
        amount: parseFloat(overheadCost.toFixed(2)),
        percentage: totalCost > 0 ? parseFloat((overheadCost / totalCost * 100).toFixed(2)) : 0
      }
    };

    // 人工成本按工种分解
    const laborCostByTradeArray = Object.entries(laborCostByTrade).map(([trade, amount]) => ({
      type: trade,
      amount: parseFloat(amount.toFixed(2)),
      percentage: totalLaborCost > 0 ? parseFloat((amount / totalLaborCost * 100).toFixed(2)) : 0
    }));

    // 材料成本按类别分解
    const materialCostByCategoryArray = Object.entries(materialCostByCategory).map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toFixed(2)),
      percentage: totalMaterialCost > 0 ? parseFloat((amount / totalMaterialCost * 100).toFixed(2)) : 0
    }));

    // 成本趋势分析（按月统计）
    const monthlyStats = {};
    completedOrders.forEach(order => {
      const monthKey = new Date(order.created_at).toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          labor: 0,
          materials: 0,
          overhead: 0
        };
      }
      
      // 计算该工单的成本
      let orderMaterialCost = 0;
      order.materials.forEach(material => {
        orderMaterialCost += parseFloat(material.price) * material.qty;
      });
      
      let orderLaborCost = 0;
      order.mechanics.forEach(mechanic => {
        orderLaborCost += parseFloat(mechanic.hours_worked || 0) * parseFloat(mechanic.mechanic.hourly_rate || 0);
      });
      
      const orderOverheadCost = (orderMaterialCost + orderLaborCost) * 0.1;
      
      monthlyStats[monthKey].materials += orderMaterialCost;
      monthlyStats[monthKey].labor += orderLaborCost;
      monthlyStats[monthKey].overhead += orderOverheadCost;
    });

    const costTrend = Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, costs]) => ({
        month: new Date(month + '-01').toLocaleDateString('zh-CN', { month: 'long' }),
        labor: parseFloat(costs.labor.toFixed(2)),
        materials: parseFloat(costs.materials.toFixed(2)),
        overhead: parseFloat(costs.overhead.toFixed(2))
      }));

    // 成本结构分析
    const costStructureStats = {
      timeRange,
      startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      grossMargin: parseFloat(grossMargin.toFixed(2)),
      costBreakdown,
      laborCostByTrade: laborCostByTradeArray,
      materialCostByCategory: materialCostByCategoryArray,
      costTrend
    };
    
    logger.info(`管理员查询了成本结构分析报表`);
    
    ctx.body = {
      status: 'success',
      data: costStructureStats
    };
  } catch (error) {
    logger.error('获取成本结构分析失败:', error);
    throw createError.internal('获取成本结构分析失败');
  }
};

module.exports = {
  getCostStructureStats
};
