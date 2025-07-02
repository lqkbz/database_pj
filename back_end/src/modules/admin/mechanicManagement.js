const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { User, MechanicProfile, WorkOrderMechanic, WorkOrder } = require('../../models');
const { Op } = require('sequelize');

const logger = createLogger('AdminMechanicManagement');

/**
 * @swagger
 * /admin/mechanics:
 *   get:
 *     summary: 获取技师列表
 *     description: 获取系统中所有技师的列表，支持分页和搜索
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
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词（姓名）
 *       - in: query
 *         name: trade
 *         schema:
 *           type: string
 *           enum: [engine, paint, electric]
 *         description: 专业领域过滤
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
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const listMechanics = async (ctx) => {
  const { page = 1, limit = 10, search, trade } = ctx.query;
  
  try {
    // 构建查询条件
    const userWhereClause = { role: 'mechanic' };
    const profileWhereClause = {};
    
    if (search) {
      userWhereClause.name = {
        [Op.like]: `%${search}%`
      };
    }
    
    if (trade) {
      profileWhereClause.trade = trade;
    }
    
    // 查询技师列表
    const { count, rows: users } = await User.findAndCountAll({
      where: userWhereClause,
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          where: profileWhereClause,
          required: true,
          include: [
            {
              model: WorkOrderMechanic,
              as: 'workOrderMechanics',
              attributes: ['order_id'],
              where: { status: { [Op.in]: ['assigned', 'in_progress'] } },
              required: false
            }
          ]
        }
      ],
      attributes: ['user_id', 'name', 'created_at'],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    // 处理数据
    const processedMechanics = users.map(user => ({
      id: user.user_id,
      name: user.name,
      trade: user.mechanicProfile.trade,
      qualification: user.mechanicProfile.qualification || '技师',
      hourlyRate: user.mechanicProfile.hourly_rate,
      hireDate: user.mechanicProfile.hire_date,
      certNo: user.mechanicProfile.cert_no,
      currentWorkload: user.mechanicProfile.workOrderMechanics ? user.mechanicProfile.workOrderMechanics.length : 0,
      joinDate: user.created_at
    }));
    
    logger.info(`管理员查询了技师列表，返回 ${users.length} 条记录`);
    
    ctx.body = {
      status: 'success',
      data: {
        mechanics: processedMechanics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取技师列表失败:', error);
    throw createError.internal('获取技师列表失败');
  }
};

/**
 * @swagger
 * /api/admin/mechanics/{id}:
 *   get:
 *     summary: 获取技师详情
 *     description: 获取指定技师的详细信息，包括基本信息、当前工单、近期完成工单等
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 技师ID
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
 *                     mechanic:
 *                       type: object
 *       401:
 *         description: 未授权
 *       404:
 *         description: 技师不存在
 *       500:
 *         description: 服务器错误
 */
const getMechanicDetail = async (ctx) => {
  const mechanicId = ctx.params.id;
  
  try {
    // 获取技师详细信息
    const user = await User.findByPk(mechanicId, {
      where: { role: 'mechanic' },
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          required: true
        }
      ],
      attributes: ['user_id', 'name', 'created_at']
    });
    
    if (!user || !user.mechanicProfile) {
      throw createError.notFound('技师不存在');
    }

    // 获取当前工单
    const currentOrders = await WorkOrderMechanic.findAll({
      where: { 
        mechanic_id: mechanicId,
        status: { [Op.in]: ['assigned', 'in_progress'] }
      },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description', 'status', 'created_at']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 获取最近完成的工单
    const recentCompletedOrders = await WorkOrderMechanic.findAll({
      where: { 
        mechanic_id: mechanicId,
        status: 'completed'
      },
      include: [
        {
          model: WorkOrder,
          as: 'workOrder',
          attributes: ['order_id', 'description', 'finished_at']
        }
      ],
      order: [['updated_at', 'DESC']],
      limit: 5
    });

    // 计算月收入（基于时薪和工作时间）
    const monthlyStats = await user.mechanicProfile.getWorkStats();
    const monthlyIncome = await user.mechanicProfile.calculateSalary();

    const mechanicDetail = {
      id: user.user_id,
      name: user.name,
      trade: user.mechanicProfile.trade,
      qualification: user.mechanicProfile.qualification || '技师',
      hourlyRate: user.mechanicProfile.hourly_rate,
      hireDate: user.mechanicProfile.hire_date,
      certNo: user.mechanicProfile.cert_no,
      joinDate: user.created_at,
      currentOrders: currentOrders.map(om => ({
        id: om.workOrder.order_id,
        description: om.workOrder.description,
        status: om.workOrder.status,
        createdAt: om.workOrder.created_at
      })),
      recentCompletedOrders: recentCompletedOrders.map(om => ({
        id: om.workOrder.order_id,
        description: om.workOrder.description,
        completedAt: om.workOrder.finished_at
      })),
      monthlyIncome: {
        current: monthlyIncome,
        totalHours: monthlyStats.total_hours || 0,
        completedOrders: monthlyStats.completed_orders || 0
      }
    };
    
    logger.info(`管理员查看了技师 ${mechanicId} 的详细信息`);
    
    ctx.body = {
      status: 'success',
      data: {
        mechanic: mechanicDetail
      }
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`获取技师详情失败 (ID: ${mechanicId}):`, error);
    throw createError.internal('获取技师详情失败');
  }
};

/**
 * @swagger
 * /api/admin/mechanics:
 *   post:
 *     summary: 创建新技师
 *     description: 在系统中创建一个新的技师账号
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - trade
 *               - hourlyRate
 *             properties:
 *               name:
 *                 type: string
 *                 description: 技师姓名
 *               trade:
 *                 type: string
 *                 enum: [engine, paint, electric]
 *                 description: 专业领域
 *               hourlyRate:
 *                 type: number
 *                 description: 时薪
 *               qualification:
 *                 type: string
 *                 description: 资质/职称
 *               certNo:
 *                 type: string
 *                 description: 认证证书编号
 *               hireDate:
 *                 type: string
 *                 format: date
 *                 description: 入职日期
 *     responses:
 *       201:
 *         description: 创建成功
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
 *                     mechanic:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const createMechanic = async (ctx) => {
  const { name, trade, hourlyRate, qualification, certNo, hireDate } = ctx.request.body;
  
  try {
    // 验证必填字段
    const requiredFields = ['name', 'trade', 'hourlyRate'];
    
    for (const field of requiredFields) {
      if (!ctx.request.body[field]) {
        throw createError.validation(`缺少必填字段: ${field}`);
      }
    }
    
    // 验证专业领域
    if (!['engine', 'paint', 'electric'].includes(trade)) {
      throw createError.validation('无效的专业领域');
    }
    
    // 验证时薪
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      throw createError.validation('时薪必须是大于0的数字');
    }
    
    // 使用事务创建用户和技师档案
    const result = await User.sequelize.transaction(async (t) => {
      // 创建用户
      const user = await User.create({
        name,
        role: 'mechanic',
        password_hash: null // 技师账号不需要密码，由管理员管理
      }, { transaction: t });
      
      // 创建技师档案
      const mechanicProfile = await MechanicProfile.create({
        mechanic_id: user.user_id,
        trade,
        hourly_rate: hourlyRate,
        qualification,
        cert_no: certNo,
        hire_date: hireDate || new Date()
      }, { transaction: t });
      
      return { user, mechanicProfile };
    });
    
    logger.info(`管理员创建了新技师: ${name} (ID: ${result.user.user_id})`);
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '技师创建成功',
      data: {
        mechanic: {
          id: result.user.user_id,
          name: result.user.name,
          trade: result.mechanicProfile.trade,
          hourlyRate: result.mechanicProfile.hourly_rate,
          qualification: result.mechanicProfile.qualification,
          certNo: result.mechanicProfile.cert_no,
          hireDate: result.mechanicProfile.hire_date,
          createdAt: result.user.created_at
        }
      }
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error('创建技师失败:', error);
    throw createError.internal('创建技师失败');
  }
};

/**
 * @swagger
 * /api/admin/mechanics/{id}:
 *   patch:
 *     summary: 更新技师信息
 *     description: 更新指定技师的信息
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 技师ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 技师姓名
 *               trade:
 *                 type: string
 *                 enum: [engine, paint, electric]
 *                 description: 专业领域
 *               hourlyRate:
 *                 type: number
 *                 description: 时薪
 *               qualification:
 *                 type: string
 *                 description: 资质/职称
 *               certNo:
 *                 type: string
 *                 description: 认证证书编号
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                     mechanicId:
 *                       type: string
 *                     updatedFields:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 技师不存在
 *       500:
 *         description: 服务器错误
 */
const updateMechanic = async (ctx) => {
  const mechanicId = ctx.params.id;
  const updateData = ctx.request.body;
  
  try {
    // 获取技师信息
    const user = await User.findByPk(mechanicId, {
      where: { role: 'mechanic' },
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          required: true
        }
      ]
    });
    
    if (!user || !user.mechanicProfile) {
      throw createError.notFound('技师不存在');
    }
    
    // 验证更新数据
    const allowedFields = ['name', 'trade', 'hourlyRate', 'qualification', 'certNo'];
    const userUpdates = {};
    const profileUpdates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'name') {
          userUpdates[key] = updateData[key];
        } else if (key === 'hourlyRate') {
          profileUpdates.hourly_rate = updateData[key];
        } else if (key === 'certNo') {
          profileUpdates.cert_no = updateData[key];
        } else {
          profileUpdates[key] = updateData[key];
        }
      }
    });
    
    if (Object.keys(userUpdates).length === 0 && Object.keys(profileUpdates).length === 0) {
      throw createError.validation('没有提供有效的更新字段');
    }
    
    // 特殊字段验证
    if (profileUpdates.trade && !['engine', 'paint', 'electric'].includes(profileUpdates.trade)) {
      throw createError.validation('无效的专业领域');
    }
    
    if (profileUpdates.hourly_rate && (isNaN(profileUpdates.hourly_rate) || profileUpdates.hourly_rate <= 0)) {
      throw createError.validation('时薪必须是大于0的数字');
    }
    
    // 使用事务更新信息
    await User.sequelize.transaction(async (t) => {
      if (Object.keys(userUpdates).length > 0) {
        await user.update(userUpdates, { transaction: t });
      }
      
      if (Object.keys(profileUpdates).length > 0) {
        await user.mechanicProfile.update(profileUpdates, { transaction: t });
      }
    });
    
    logger.info(`管理员更新了技师 ${mechanicId} 的信息`);
    
    ctx.body = {
      status: 'success',
      message: '技师信息已更新',
      data: {
        mechanicId,
        updatedFields: Object.keys({...userUpdates, ...profileUpdates})
      }
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`更新技师信息失败 (ID: ${mechanicId}):`, error);
    throw createError.internal('更新技师信息失败');
  }
};

/**
 * @swagger
 * /api/admin/mechanics/{id}:
 *   delete:
 *     summary: 删除技师
 *     description: 从系统中删除指定的技师，仅当技师没有进行中的工单时才能删除
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 技师ID
 *     responses:
 *       200:
 *         description: 删除成功
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
 *         description: 技师不存在
 *       409:
 *         description: 冲突（如技师有未完成的工单）
 *       500:
 *         description: 服务器错误
 */
const deleteMechanic = async (ctx) => {
  const mechanicId = ctx.params.id;
  
  try {
    // 获取技师信息
    const user = await User.findByPk(mechanicId, {
      where: { role: 'mechanic' },
      include: [
        {
          model: MechanicProfile,
          as: 'mechanicProfile',
          required: true
        }
      ]
    });
    
    if (!user || !user.mechanicProfile) {
      throw createError.notFound('技师不存在');
    }
    
    // 检查技师是否有进行中的工单
    const activeOrders = await WorkOrderMechanic.count({
      where: { 
        mechanic_id: mechanicId,
        status: { [Op.in]: ['assigned', 'in_progress'] }
      }
    });
    
    if (activeOrders > 0) {
      throw createError.conflict('该技师有未完成的工单，无法删除');
    }
    
    // 使用事务删除技师档案和用户
    await User.sequelize.transaction(async (t) => {
      await user.mechanicProfile.destroy({ transaction: t });
      await user.destroy({ transaction: t });
    });
    
    logger.info(`管理员删除了技师 ${mechanicId}`);
    
    ctx.body = {
      status: 'success',
      message: '技师已删除'
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    logger.error(`删除技师失败 (ID: ${mechanicId}):`, error);
    throw createError.internal('删除技师失败');
  }
};

module.exports = {
  listMechanics,
  getMechanicDetail,
  createMechanic,
  updateMechanic,
  deleteMechanic
};