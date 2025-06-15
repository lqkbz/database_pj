const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminMechanicManagement');

/**
 * @swagger
 * /api/admin/mechanics:
 *   get:
 *     summary: 获取所有技师列表
 *     description: 获取系统中所有技师的列表，支持分页、搜索和过滤
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
 *         description: 搜索关键词（技师姓名、电话、邮箱等）
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *         description: 按专业领域筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: 技师状态
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
 *                     mechanics:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const listMechanics = async (ctx) => {
  const { page = 1, limit = 10, search, specialty, status } = ctx.query;
  
  // 构建查询条件
  const query = {};
  if (search) {
    // 实际项目中替换为搜索条件
    query.search = search;
  }
  
  if (specialty) {
    query.specialty = specialty;
  }
  
  if (status) {
    query.status = status;
  }
  
  // 从数据库获取技师列表
  // 实际项目中替换为数据库查询
  const mechanics = [
    {
      id: 'mech1',
      name: '李师傅',
      phone: '13911112222',
      email: 'lishifu@example.com',
      specialties: ['发动机维修', '电子系统诊断', '底盘调校'],
      qualification: '高级汽车维修技师',
      status: 'active',
      joinDate: '2020-03-15',
      rating: 4.8,
      completedOrders: 356,
      currentLoad: 3
    },
    {
      id: 'mech2',
      name: '王师傅',
      phone: '13922223333',
      email: 'wangshifu@example.com',
      specialties: ['钣金喷漆', '车身维修', '空调系统'],
      qualification: '中级汽车维修技师',
      status: 'active',
      joinDate: '2021-05-10',
      rating: 4.5,
      completedOrders: 220,
      currentLoad: 2
    },
    {
      id: 'mech3',
      name: '张师傅',
      phone: '13933334444',
      email: 'zhangshifu@example.com',
      specialties: ['变速箱维修', '离合器更换', '悬挂系统'],
      qualification: '高级汽车维修技师',
      status: 'inactive',
      joinDate: '2019-11-20',
      rating: 4.7,
      completedOrders: 410,
      currentLoad: 0
    }
  ];
  
  // 计算总技师数
  const total = mechanics.length;
  
  logger.info(`管理员查询了技师列表，返回 ${mechanics.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
      mechanics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  };
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
  
  // 从数据库获取技师详情
  // 实际项目中替换为数据库查询
  const mechanic = {
    id: mechanicId,
    name: '李师傅',
    phone: '13911112222',
    email: 'lishifu@example.com',
    specialties: ['发动机维修', '电子系统诊断', '底盘调校'],
    qualification: '高级汽车维修技师',
    certification: ['ASE认证', '本田认证技师'],
    experience: 8,  // 工作年限
    joinDate: '2020-03-15',
    avatar: 'https://example.com/avatars/mechanic1.jpg',
    status: 'active',
    rating: 4.8,
    completedOrders: 356,
    currentOrders: [
      {
        id: 'wo1',
        vehicleInfo: {
          make: '丰田',
          model: '卡罗拉',
          licensePlate: '京A12345'
        },
        description: '发动机异响，怠速不稳',
        status: 'in_progress',
        createdAt: '2023-05-15T08:30:00Z'
      },
      {
        id: 'wo3',
        vehicleInfo: {
          make: '大众',
          model: '帕萨特',
          licensePlate: '京C54321'
        },
        description: '更换变速箱油',
        status: 'accepted',
        createdAt: '2023-05-18T10:45:00Z'
      }
    ],
    recentCompletedOrders: [
      {
        id: 'wo2',
        vehicleInfo: {
          make: '本田',
          model: '思域',
          licensePlate: '京B67890'
        },
        description: '更换刹车片，更换机油',
        status: 'completed',
        completedAt: '2023-05-10T15:30:00Z',
        rating: 5
      }
    ],
    monthlyIncome: {
      current: 12800,
      previous: 11500,
      percentChange: 11.3
    },
    workingHours: {
      monday: { start: '08:00', end: '17:00' },
      tuesday: { start: '08:00', end: '17:00' },
      wednesday: { start: '08:00', end: '17:00' },
      thursday: { start: '08:00', end: '17:00' },
      friday: { start: '08:00', end: '17:00' },
      saturday: { start: '09:00', end: '15:00' },
      sunday: { start: null, end: null }
    }
  };
  
  // 检查技师是否存在
  if (!mechanic) {
    throw createError.notFound('技师不存在');
  }
  
  logger.info(`管理员查看了技师 ${mechanicId} 的详细信息`);
  
  ctx.body = {
    status: 'success',
    data: {
      mechanic
    }
  };
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
 *               - phone
 *               - email
 *               - specialties
 *               - qualification
 *             properties:
 *               name:
 *                 type: string
 *                 description: 技师姓名
 *               phone:
 *                 type: string
 *                 description: 手机号码
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 电子邮箱
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 专业领域
 *               qualification:
 *                 type: string
 *                 description: 资质/职称
 *               certification:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 认证证书
 *               experience:
 *                 type: integer
 *                 description: 工作年限
 *               workingHours:
 *                 type: object
 *                 description: 工作时间安排
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
 *       409:
 *         description: 资源冲突（如邮箱或手机号已存在）
 *       500:
 *         description: 服务器错误
 */
const createMechanic = async (ctx) => {
  const mechanicData = ctx.request.body;
  
  // 验证必填字段
  const requiredFields = ['name', 'phone', 'email', 'specialties', 'qualification'];
  
  for (const field of requiredFields) {
    if (!mechanicData[field]) {
      throw createError.validation(`缺少必填字段: ${field}`);
    }
  }
  
  // 验证专业领域是否为数组
  if (!Array.isArray(mechanicData.specialties) || mechanicData.specialties.length === 0) {
    throw createError.validation('专业领域必须是非空数组');
  }
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(mechanicData.email)) {
    throw createError.validation('邮箱格式不正确');
  }
  
  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(mechanicData.phone)) {
    throw createError.validation('手机号格式不正确');
  }
  
  // 检查邮箱是否已存在
  // 实际项目中替换为数据库查询
  const emailExists = false;
  
  if (emailExists) {
    throw createError.conflict('该邮箱已被注册');
  }
  
  // 检查手机号是否已存在
  // 实际项目中替换为数据库查询
  const phoneExists = false;
  
  if (phoneExists) {
    throw createError.conflict('该手机号已被注册');
  }
  
  // 创建技师账号（在数据库中）
  // 实际项目中替换为数据库操作
  const newMechanic = {
    id: 'mech' + Date.now(),
    ...mechanicData,
    status: 'active',
    joinDate: new Date().toISOString(),
    completedOrders: 0,
    rating: 0,
    createdAt: new Date().toISOString()
  };
  
  logger.info(`管理员创建了新技师: ${newMechanic.name}`);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    message: '技师创建成功',
    data: {
      mechanic: newMechanic
    }
  };
};

/**
 * @swagger
 * /api/admin/mechanics/{id}:
 *   put:
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
 *               phone:
 *                 type: string
 *                 description: 手机号码
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 电子邮箱
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 专业领域
 *               qualification:
 *                 type: string
 *                 description: 资质/职称
 *               certification:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 认证证书
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 description: 技师状态
 *               workingHours:
 *                 type: object
 *                 description: 工作时间安排
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
 *       409:
 *         description: 资源冲突（如邮箱或手机号已被其他用户使用）
 *       500:
 *         description: 服务器错误
 */
const updateMechanic = async (ctx) => {
  const mechanicId = ctx.params.id;
  const updateData = ctx.request.body;
  
  // 获取技师信息（从数据库）
  // 实际项目中替换为数据库查询
  const mechanic = {
    id: mechanicId,
    name: '李师傅',
    status: 'active'
  };
  
  // 检查技师是否存在
  if (!mechanic) {
    throw createError.notFound('技师不存在');
  }
  
  // 验证更新数据
  const allowedFields = ['name', 'phone', 'email', 'specialties', 'qualification', 'certification', 'status', 'workingHours'];
  const updates = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = updateData[key];
    }
  });
  
  if (Object.keys(updates).length === 0) {
    throw createError.validation('没有提供有效的更新字段');
  }
  
  // 特殊字段验证
  if (updates.status && !['active', 'inactive', 'suspended'].includes(updates.status)) {
    throw createError.validation('无效的状态值');
  }
  
  if (updates.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.email)) {
      throw createError.validation('邮箱格式不正确');
    }
    
    // 检查邮箱是否已被其他用户使用
    // 实际项目中替换为数据库查询
  }
  
  if (updates.phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(updates.phone)) {
      throw createError.validation('手机号格式不正确');
    }
    
    // 检查手机号是否已被其他用户使用
    // 实际项目中替换为数据库查询
  }
  
  // 更新技师信息（在数据库中）
  // 实际项目中替换为数据库更新操作
  
  logger.info(`管理员更新了技师 ${mechanicId} 的信息`);
  
  ctx.body = {
    status: 'success',
    message: '技师信息已更新',
    data: {
      mechanicId,
      updatedFields: Object.keys(updates)
    }
  };
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
  
  // 获取技师信息（从数据库）
  // 实际项目中替换为数据库查询
  const mechanic = {
    id: mechanicId,
    name: '李师傅',
    status: 'active',
    currentOrders: []
  };
  
  // 检查技师是否存在
  if (!mechanic) {
    throw createError.notFound('技师不存在');
  }
  
  // 检查技师是否有进行中的工单
  if (mechanic.currentOrders && mechanic.currentOrders.length > 0) {
    throw createError.conflict('该技师有未完成的工单，无法删除');
  }
  
  // 删除技师（在数据库中）
  // 实际项目中替换为数据库删除操作
  // 注意：实际应用中可能使用软删除（更新状态）而不是硬删除
  
  logger.info(`管理员删除了技师 ${mechanicId}`);
  
  ctx.body = {
    status: 'success',
    message: '技师已删除'
  };
};

module.exports = {
  listMechanics,
  getMechanicDetail,
  createMechanic,
  updateMechanic,
  deleteMechanic
};