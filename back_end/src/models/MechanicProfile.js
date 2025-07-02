/**
 * 技师档案模型 - MechanicProfile Model
 * 
 * 功能说明：
 * - 管理技师的专业信息和资质
 * - 记录技师的工作能力和薪资信息
 * - 与用户表一对一关联
 * 
 * 数据表：MECHANIC_PROFILE
 * 主要字段：
 * - mechanic_id: BIGINT, 主键（等于user_id）
 * - trade: ENUM('engine','paint','electric'), 专业领域
 * - hourly_rate: DECIMAL(6,2), 时薪
 * - hire_date: DATE, 入职日期
 * - cert_no: VARCHAR, 资质证书编号
 * 
 * 关联关系：
 * - 一个技师档案对应一个用户（mechanic角色）
 * - 一个技师可以参与多个工单
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MechanicProfile:
 *       type: object
 *       properties:
 *         mechanic_id:
 *           type: integer
 *           description: 技师ID（对应用户ID）
 *         trade:
 *           type: string
 *           enum: [engine, paint, electric]
 *           description: 专业工种
 *         hourly_rate:
 *           type: number
 *           format: decimal
 *           description: 时薪
 *         hire_date:
 *           type: string
 *           format: date
 *           description: 入职日期
 *         cert_no:
 *           type: string
 *           description: 资质证书编号
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MechanicProfile = sequelize.define('MechanicProfile', {
    mechanic_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      field: 'mechanic_id',
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    trade: {
      type: DataTypes.ENUM('engine', 'paint', 'electric'),
      field: 'trade'
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(6, 2),
      field: 'hourly_rate'
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      field: 'hire_date'
    },
    cert_no: {
      type: DataTypes.STRING,
      field: 'cert_no'
    }
  }, {
    tableName: 'mechanic_profiles',
    timestamps: false,
    indexes: [
      {
        fields: ['trade']
      }
    ]
  });

  // 实例方法：获取工作统计
  MechanicProfile.prototype.getWorkStats = async function(startDate, endDate) {
    const models = sequelize.models;
    const stats = await models.WorkOrderMechanic.findAll({
      where: {
        mechanic_id: this.mechanic_id,
        ...(startDate && endDate && {
          created_at: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
          }
        })
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('order_id')), 'total_orders'],
        [sequelize.fn('SUM', sequelize.col('hours_worked')), 'total_hours'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed_orders']
      ],
      raw: true
    });
    return stats[0];
  };

  // 实例方法：计算薪资
  MechanicProfile.prototype.calculateSalary = async function(startDate, endDate) {
    const workStats = await this.getWorkStats(startDate, endDate);
    const totalHours = parseFloat(workStats.total_hours) || 0;
    const hourlyRate = parseFloat(this.hourly_rate) || 0;
    return totalHours * hourlyRate;
  };

  // 类方法：根据专业领域查找技师
  MechanicProfile.findByTrade = async function(trade) {
    return await MechanicProfile.findAll({
      where: { trade },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['name']
      }]
    });
  };

  // 类方法：获取可用技师列表
  MechanicProfile.getAvailableMechanics = async function() {
    return await MechanicProfile.findAll({
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['name']
      }, {
        model: sequelize.models.WorkOrderMechanic,
        as: 'workOrderMechanics',
        where: { status: 'accepted' },
        required: false
      }]
    });
  };

  // 定义关联关系
  MechanicProfile.associate = function(models) {
    // 技师档案属于一个用户
    MechanicProfile.belongsTo(models.User, {
      foreignKey: 'mechanic_id',
      targetKey: 'user_id',
      as: 'user'
    });

    // 技师参与多个工单
    MechanicProfile.hasMany(models.WorkOrderMechanic, {
      foreignKey: 'mechanic_id',
      as: 'workOrderMechanics'
    });
  };

  return MechanicProfile;
}; 