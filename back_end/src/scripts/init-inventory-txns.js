/**
 * 库存交易初始化脚本
 * 为数据库中的InventoryTxn表添加初始的库存交易记录
 */

const { sequelize, InventoryTxn, Part } = require('../models');

// 预定义的库存交易数据生成规则
const inventoryRules = {
  // 润滑油类 - 通常库存量较大
  '机油': { baseStock: 200, variance: 50 },
  '齿轮油': { baseStock: 80, variance: 20 },
  '变速箱油': { baseStock: 60, variance: 15 },
  '刹车油': { baseStock: 40, variance: 10 },
  '防冻液': { baseStock: 100, variance: 25 },
  '玻璃水': { baseStock: 150, variance: 30 },

  // 滤芯类 - 中等库存
  '滤芯': { baseStock: 50, variance: 15 },

  // 轮胎类 - 库存相对较少
  '轮胎': { baseStock: 20, variance: 8 },

  // 刹车系统 - 中等库存
  '刹车': { baseStock: 30, variance: 10 },

  // 点火系统 - 小配件，库存较多
  '火花塞': { baseStock: 100, variance: 20 },
  '点火线圈': { baseStock: 25, variance: 8 },
  '高压线': { baseStock: 15, variance: 5 },

  // 电气系统 - 库存较少
  '蓄电池': { baseStock: 10, variance: 3 },
  '启动马达': { baseStock: 8, variance: 2 },
  '发电机': { baseStock: 5, variance: 2 },

  // 传动系统 - 中等库存
  '离合器': { baseStock: 15, variance: 5 },
  '变速器': { baseStock: 8, variance: 3 },
  '轴承': { baseStock: 40, variance: 10 },

  // 悬挂系统 - 中等库存
  '减震器': { baseStock: 20, variance: 8 },
  '弹簧': { baseStock: 25, variance: 8 },
  '连杆': { baseStock: 35, variance: 10 },

  // 发动机部件 - 小批量库存
  '活塞': { baseStock: 20, variance: 5 },
  '气门': { baseStock: 80, variance: 20 },
  '凸轮轴': { baseStock: 8, variance: 2 },
  '皮带': { baseStock: 30, variance: 8 },
  '水泵': { baseStock: 15, variance: 5 },
  '节温器': { baseStock: 25, variance: 8 },

  // 密封件类 - 库存较多
  '垫': { baseStock: 50, variance: 15 },
  '油封': { baseStock: 100, variance: 25 },
  '密封': { baseStock: 60, variance: 15 },

  // 空调系统 - 库存较少
  '压缩机': { baseStock: 5, variance: 2 },
  '冷凝器': { baseStock: 8, variance: 3 },
  '蒸发器': { baseStock: 6, variance: 2 },

  // 其他配件 - 根据类型决定
  '雨刷': { baseStock: 40, variance: 10 },
  '大灯': { baseStock: 12, variance: 4 },
  '尾灯': { baseStock: 15, variance: 5 },
  '倒车镜': { baseStock: 20, variance: 6 },

  // 化学用品 - 库存较大
  '清洗剂': { baseStock: 80, variance: 20 },
  '除锈剂': { baseStock: 40, variance: 10 },
  '黄油': { baseStock: 30, variance: 8 },
  '胶': { baseStock: 25, variance: 6 }
};

/**
 * 根据配件名称获取库存规则
 */
function getStockRule(partName) {
  for (const [keyword, rule] of Object.entries(inventoryRules)) {
    if (partName.includes(keyword)) {
      return rule;
    }
  }
  // 默认规则
  return { baseStock: 20, variance: 5 };
}

/**
 * 生成随机库存数量
 */
function generateRandomStock(baseStock, variance) {
  const min = Math.max(1, baseStock - variance);
  const max = baseStock + variance;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机日期（过去30天内）
 */
function generateRandomDate(daysBack = 30) {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);
  
  const date = new Date(now);
  date.setDate(date.getDate() - randomDays);
  date.setHours(randomHours, randomMinutes, 0, 0);
  
  return date;
}

/**
 * 为配件创建初始入库记录
 */
async function createInitialStock(part) {
  const rule = getStockRule(part.name);
  const initialStock = generateRandomStock(rule.baseStock, rule.variance);
  
  // 创建初始入库记录
  const initialDate = generateRandomDate(15); // 过去15天内的入库
  
  return {
    part_id: part.part_id,
    qty: initialStock,
    type: 'IN',
    created_at: initialDate
  };
}

/**
 * 初始化库存交易数据
 */
async function initInventoryTxns() {
  try {
    console.log('开始初始化库存交易数据...');

    // 检查是否已有数据
    const existingCount = await InventoryTxn.count();
    if (existingCount > 0) {
      console.log(`库存交易表中已有 ${existingCount} 条数据`);
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('是否要清空现有数据并重新初始化？(y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('取消初始化操作');
        return;
      }

      // 清空现有数据
      await InventoryTxn.destroy({ where: {} });
      console.log('已清空现有库存交易数据');
    }

    // 获取所有配件
    const parts = await Part.findAll();
    if (parts.length === 0) {
      console.log('警告：配件表中没有数据，请先运行 init-parts.js 初始化配件数据');
      return;
    }

    console.log(`找到 ${parts.length} 个配件，开始生成库存交易记录...`);

    const allTransactions = [];
    let totalInitialStock = 0;

    // 为每个配件创建初始入库记录
    for (const part of parts) {
      const initialStock = await createInitialStock(part);
      allTransactions.push(initialStock);
      totalInitialStock += initialStock.qty;

      // 30%概率创建补充入库记录
      if (Math.random() < 0.3) {
        const rule = getStockRule(part.name);
        const supplementQty = Math.floor(generateRandomStock(rule.baseStock, rule.variance) * 0.3);
        if (supplementQty > 0) {
          const supplementDate = generateRandomDate(5);
          allTransactions.push({
            part_id: part.part_id,
            qty: supplementQty,
            type: 'IN',
            created_at: supplementDate
          });
          totalInitialStock += supplementQty;
        }
      }

      // 60%概率创建使用记录
      if (Math.random() < 0.6) {
        const usageCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < usageCount; i++) {
          const usageQty = Math.floor(Math.random() * 5) + 1;
          const usageDate = generateRandomDate(10);
          allTransactions.push({
            part_id: part.part_id,
            qty: -usageQty,
            type: 'OUT',
            order_id: null,
            created_at: usageDate
          });
        }
      }

      // 30%概率创建库存调整记录
      if (Math.random() < 0.3) {
        const adjustmentQty = Math.floor(Math.random() * 10) - 5;
        if (adjustmentQty !== 0) {
          const adjustmentDate = generateRandomDate(7);
          allTransactions.push({
            part_id: part.part_id,
            qty: adjustmentQty,
            type: 'ADJUST',
            created_at: adjustmentDate
          });
        }
      }
    }

    // 按时间排序
    allTransactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // 批量插入数据
    const createdTransactions = await InventoryTxn.bulkCreate(allTransactions, {
      validate: true,
      returning: true
    });

    console.log(`成功插入 ${createdTransactions.length} 条库存交易记录`);
    
    // 显示统计信息
    console.log('\n库存交易统计：');
    const typeStats = createdTransactions.reduce((acc, txn) => {
      acc[txn.type] = (acc[txn.type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(typeStats).forEach(([type, count]) => {
      const typeName = type === 'IN' ? '入库' : type === 'OUT' ? '出库' : '调整';
      console.log(`- ${typeName}：${count} 条记录`);
    });

    console.log(`\n总初始库存价值：${totalInitialStock} 个单位`);
    console.log('\n库存交易数据初始化完成！');

    // 显示前几个配件的库存情况
    console.log('\n前5个配件的当前库存：');
    for (let i = 0; i < Math.min(5, parts.length); i++) {
      const part = parts[i];
      const currentStock = await InventoryTxn.getCurrentStock(part.part_id);
      console.log(`- ${part.name}: ${currentStock} ${part.unit}`);
    }

  } catch (error) {
    console.error('初始化库存交易数据时出错：', error);
    throw error;
  }
}

/**
 * 显示当前库存交易数量
 */
async function showCount() {
  try {
    const count = await InventoryTxn.count();
    console.log(`当前数据库中共有 ${count} 条库存交易记录`);
  } catch (error) {
    console.error('查询库存交易数量时出错：', error);
  }
}

/**
 * 显示所有配件的库存情况
 */
async function showStock() {
  try {
    const parts = await Part.findAll();
    if (parts.length === 0) {
      console.log('配件表中没有数据');
      return;
    }

    console.log('所有配件的当前库存：\n');
    console.log('配件名称\t\t\t当前库存\t单位');
    console.log(''.padEnd(50, '-'));
    
    for (const part of parts) {
      const currentStock = await InventoryTxn.getCurrentStock(part.part_id);
      const name = part.name.padEnd(20, ' ');
      console.log(`${name}\t${currentStock}\t\t${part.unit}`);
    }
  } catch (error) {
    console.error('查询库存情况时出错：', error);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
库存交易初始化脚本使用说明：

用法：
  node init-inventory-txns.js [选项]

选项：
  --help, -h      显示此帮助信息
  --count, -c     显示当前数据库中的库存交易数量
  --stock, -s     显示所有配件的当前库存情况

示例：
  node init-inventory-txns.js           # 执行库存交易数据初始化
  node init-inventory-txns.js --count   # 查看当前交易记录数量
  node init-inventory-txns.js --stock   # 查看所有配件库存
    `);
    return;
  }
  
  if (args.includes('--count') || args.includes('-c')) {
    await showCount();
    return;
  }
  
  if (args.includes('--stock') || args.includes('-s')) {
    await showStock();
    return;
  }
  
  // 默认执行初始化
  await initInventoryTxns();
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败：', error);
      process.exit(1);
    });
}

module.exports = {
  initInventoryTxns,
  getStockRule,
  generateRandomStock
}; 