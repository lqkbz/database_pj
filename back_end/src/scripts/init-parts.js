/**
 * 配件初始化脚本
 * 为数据库中的Part表添加常见的汽车维修配件数据，包括库存数量
 */

const { sequelize, Part } = require('../models');

// 库存规则配置
const stockRules = {
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
  for (const [keyword, rule] of Object.entries(stockRules)) {
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

// 预定义的配件数据（包含qty字段）
const initialParts = [
  // 润滑油类 (L为单位)
  { name: '5W-30全合成机油', unit: 'L', unit_cost: 45.00 },
  { name: '0W-20全合成机油', unit: 'L', unit_cost: 50.00 },
  { name: '10W-40半合成机油', unit: 'L', unit_cost: 35.00 },
  { name: '齿轮油', unit: 'L', unit_cost: 25.00 },
  { name: '变速箱油', unit: 'L', unit_cost: 65.00 },
  { name: '刹车油', unit: 'L', unit_cost: 30.00 },
  { name: '防冻液', unit: 'L', unit_cost: 20.00 },
  { name: '玻璃水', unit: 'L', unit_cost: 8.00 },

  // 滤芯类 (pcs为单位)
  { name: '机油滤芯', unit: 'pcs', unit_cost: 25.00 },
  { name: '空气滤芯', unit: 'pcs', unit_cost: 45.00 },
  { name: '汽油滤芯', unit: 'pcs', unit_cost: 35.00 },
  { name: '空调滤芯', unit: 'pcs', unit_cost: 40.00 },

  // 轮胎类 (pcs为单位)
  { name: '185/65R15轮胎', unit: 'pcs', unit_cost: 280.00 },
  { name: '195/65R15轮胎', unit: 'pcs', unit_cost: 320.00 },
  { name: '205/55R16轮胎', unit: 'pcs', unit_cost: 380.00 },
  { name: '215/60R16轮胎', unit: 'pcs', unit_cost: 420.00 },
  { name: '225/45R17轮胎', unit: 'pcs', unit_cost: 480.00 },

  // 刹车系统 (pcs为单位)
  { name: '前刹车片', unit: 'pcs', unit_cost: 150.00 },
  { name: '后刹车片', unit: 'pcs', unit_cost: 120.00 },
  { name: '前刹车盘', unit: 'pcs', unit_cost: 200.00 },
  { name: '后刹车盘', unit: 'pcs', unit_cost: 180.00 },
  { name: '刹车鼓', unit: 'pcs', unit_cost: 160.00 },

  // 点火系统 (pcs为单位)
  { name: '火花塞', unit: 'pcs', unit_cost: 15.00 },
  { name: '点火线圈', unit: 'pcs', unit_cost: 80.00 },
  { name: '高压线', unit: 'pcs', unit_cost: 120.00 },

  // 电气系统 (pcs为单位)
  { name: '蓄电池12V60AH', unit: 'pcs', unit_cost: 380.00 },
  { name: '蓄电池12V80AH', unit: 'pcs', unit_cost: 450.00 },
  { name: '启动马达', unit: 'pcs', unit_cost: 380.00 },
  { name: '发电机', unit: 'pcs', unit_cost: 680.00 },

  // 传动系统 (pcs为单位)
  { name: '离合器片', unit: 'pcs', unit_cost: 180.00 },
  { name: '离合器压盘', unit: 'pcs', unit_cost: 220.00 },
  { name: '分离轴承', unit: 'pcs', unit_cost: 80.00 },
  { name: 'CVT变速器皮带', unit: 'pcs', unit_cost: 350.00 },

  // 悬挂系统 (pcs为单位)
  { name: '减震器（前）', unit: 'pcs', unit_cost: 280.00 },
  { name: '减震器（后）', unit: 'pcs', unit_cost: 260.00 },
  { name: '弹簧（前）', unit: 'pcs', unit_cost: 150.00 },
  { name: '弹簧（后）', unit: 'pcs', unit_cost: 140.00 },
  { name: '稳定杆连杆', unit: 'pcs', unit_cost: 60.00 },

  // 发动机部件 (pcs为单位)
  { name: '活塞环组', unit: 'pcs', unit_cost: 120.00 },
  { name: '气门', unit: 'pcs', unit_cost: 35.00 },
  { name: '凸轮轴', unit: 'pcs', unit_cost: 480.00 },
  { name: '正时皮带', unit: 'pcs', unit_cost: 80.00 },
  { name: '水泵', unit: 'pcs', unit_cost: 180.00 },
  { name: '节温器', unit: 'pcs', unit_cost: 25.00 },

  // 密封件类 (pcs为单位)
  { name: '缸盖垫', unit: 'pcs', unit_cost: 150.00 },
  { name: '油封', unit: 'pcs', unit_cost: 15.00 },
  { name: '密封条', unit: 'pcs', unit_cost: 20.00 },

  // 空调系统 (pcs为单位)
  { name: '压缩机', unit: 'pcs', unit_cost: 800.00 },
  { name: '冷凝器', unit: 'pcs', unit_cost: 350.00 },
  { name: '蒸发器', unit: 'pcs', unit_cost: 280.00 },

  // 其他常用配件 (pcs为单位)
  { name: '雨刷器片', unit: 'pcs', unit_cost: 25.00 },
  { name: '前大灯总成', unit: 'pcs', unit_cost: 380.00 },
  { name: '后尾灯总成', unit: 'pcs', unit_cost: 180.00 },
  { name: '倒车镜', unit: 'pcs', unit_cost: 120.00 },

  // 化学用品 (L为单位，除了部分按重量计算)
  { name: '清洗剂', unit: 'L', unit_cost: 12.00 },
  { name: '除锈剂', unit: 'L', unit_cost: 18.00 },
  { name: '黄油', unit: 'kg', unit_cost: 25.00 },
  { name: '密封胶', unit: 'kg', unit_cost: 30.00 }
].map(part => {
  // 为每个配件生成合理的库存数量
  const rule = getStockRule(part.name);
  const qty = generateRandomStock(rule.baseStock, rule.variance);
  return { ...part, qty };
});

/**
 * 初始化配件数据
 */
async function initParts() {
  try {
    console.log('开始初始化配件数据...');

    // 检查是否已有数据
    const existingCount = await Part.count();
    if (existingCount > 0) {
      console.log(`配件表中已有 ${existingCount} 条数据`);
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
      await Part.destroy({ where: {} });
      console.log('已清空现有配件数据');
    }

    // 批量插入新数据
    const createdParts = await Part.bulkCreate(initialParts, {
      validate: true,
      returning: true
    });

    console.log(`成功插入 ${createdParts.length} 条配件记录`);
    
    // 显示插入的数据概览
    console.log('\n插入的配件类型统计：');
    const unitStats = createdParts.reduce((acc, part) => {
      acc[part.unit] = (acc[part.unit] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(unitStats).forEach(([unit, count]) => {
      console.log(`- ${unit}：${count} 种配件`);
    });

    // 显示库存价值统计
    console.log('\n库存价值统计：');
    const totalValue = createdParts.reduce((acc, part) => {
      return acc + (parseFloat(part.unit_cost) * part.qty);
    }, 0);
    console.log(`- 总库存价值：¥${totalValue.toFixed(2)}`);

    const totalQty = createdParts.reduce((acc, part) => acc + part.qty, 0);
    console.log(`- 总库存数量：${totalQty} 个单位`);

    // 显示前10个配件的库存详情
    console.log('\n前10个配件的库存详情：');
    console.log('配件名称\t\t\t库存数量\t单位\t单价');
    console.log(''.padEnd(60, '-'));
    
    createdParts.slice(0, 10).forEach(part => {
      const name = part.name.padEnd(20, ' ');
      console.log(`${name}\t${part.qty}\t\t${part.unit}\t¥${part.unit_cost}`);
    });

    console.log('\n配件数据初始化完成！');

  } catch (error) {
    console.error('初始化配件数据时出错：', error);
    throw error;
  }
}

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log(`
配件初始化脚本使用说明：

用法：
  node init-parts.js [选项]

选项：
  --help, -h     显示此帮助信息
  --list, -l     仅列出将要插入的配件数据，不执行插入操作
  --count, -c    显示当前数据库中的配件数量
  --stock, -s    显示所有配件的库存情况
  --value, -v    显示库存价值统计

示例：
  node init-parts.js           # 执行配件数据初始化
  node init-parts.js --list    # 预览要插入的配件数据
  node init-parts.js --count   # 查看当前配件数量
  node init-parts.js --stock   # 查看库存情况
  `);
}

/**
 * 列出将要插入的配件数据
 */
function listParts() {
  console.log('将要插入的配件数据：\n');
  console.log('序号\t配件名称\t\t\t库存\t单位\t单价(元)');
  console.log(''.padEnd(70, '-'));
  
  initialParts.forEach((part, index) => {
    const name = part.name.padEnd(20, ' ');
    console.log(`${(index + 1).toString().padStart(2)}\t${name}\t${part.qty}\t${part.unit}\t¥${part.unit_cost}`);
  });
  
  const totalValue = initialParts.reduce((acc, part) => acc + (part.unit_cost * part.qty), 0);
  const totalQty = initialParts.reduce((acc, part) => acc + part.qty, 0);
  
  console.log(`\n总计：${initialParts.length} 种配件`);
  console.log(`总库存数量：${totalQty} 个单位`);
  console.log(`总库存价值：¥${totalValue.toFixed(2)}`);
}

/**
 * 显示当前配件数量
 */
async function showCount() {
  try {
    const count = await Part.count();
    console.log(`当前数据库中共有 ${count} 条配件记录`);
  } catch (error) {
    console.error('查询配件数量时出错：', error);
  }
}

/**
 * 显示库存情况
 */
async function showStock() {
  try {
    const parts = await Part.findAll({
      order: [['qty', 'DESC']]
    });
    
    if (parts.length === 0) {
      console.log('配件表中没有数据');
      return;
    }

    console.log('所有配件的库存情况：\n');
    console.log('配件名称\t\t\t库存数量\t单位\t库存价值');
    console.log(''.padEnd(70, '-'));
    
    let totalValue = 0;
    let totalQty = 0;
    
    parts.forEach(part => {
      const name = part.name.padEnd(20, ' ');
      const stockValue = parseFloat(part.unit_cost) * part.qty;
      totalValue += stockValue;
      totalQty += part.qty;
      console.log(`${name}\t${part.qty}\t\t${part.unit}\t¥${stockValue.toFixed(2)}`);
    });
    
    console.log(''.padEnd(70, '-'));
    console.log(`总计：\t\t\t\t${totalQty}\t\t¥${totalValue.toFixed(2)}`);
    
  } catch (error) {
    console.error('查询库存情况时出错：', error);
  }
}

/**
 * 显示库存价值统计
 */
async function showValue() {
  try {
    const parts = await Part.findAll();
    
    if (parts.length === 0) {
      console.log('配件表中没有数据');
      return;
    }

    // 按单位分类统计
    const stats = parts.reduce((acc, part) => {
      if (!acc[part.unit]) {
        acc[part.unit] = { count: 0, qty: 0, value: 0 };
      }
      acc[part.unit].count += 1;
      acc[part.unit].qty += part.qty;
      acc[part.unit].value += parseFloat(part.unit_cost) * part.qty;
      return acc;
    }, {});

    console.log('库存价值统计：\n');
    console.log('计量单位\t配件种类\t库存数量\t库存价值');
    console.log(''.padEnd(50, '-'));
    
    let totalCount = 0;
    let totalQty = 0;
    let totalValue = 0;
    
    Object.entries(stats).forEach(([unit, stat]) => {
      totalCount += stat.count;
      totalQty += stat.qty;
      totalValue += stat.value;
      console.log(`${unit}\t\t${stat.count}\t\t${stat.qty}\t\t¥${stat.value.toFixed(2)}`);
    });
    
    console.log(''.padEnd(50, '-'));
    console.log(`总计\t\t${totalCount}\t\t${totalQty}\t\t¥${totalValue.toFixed(2)}`);
    
  } catch (error) {
    console.error('查询库存价值时出错：', error);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--list') || args.includes('-l')) {
    listParts();
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
  
  if (args.includes('--value') || args.includes('-v')) {
    await showValue();
    return;
  }
  
  // 默认执行初始化
  await initParts();
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
  initParts,
  initialParts,
  getStockRule,
  generateRandomStock
}; 