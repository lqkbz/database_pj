const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('Vehicles');

/**
 * @swagger
 * /api/customers/vehicles:
 *   get:
 *     summary: 获取当前客户的所有车辆
 *     description: 获取当前登录客户的所有车辆信息
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
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
 *                     vehicles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           make:
 *                             type: string
 *                           model:
 *                             type: string
 *                           year:
 *                             type: integer
 *                           licensePlate:
 *                             type: string
 *                           vin:
 *                             type: string
 *                           mileage:
 *                             type: integer
 *                           lastMaintenanceDate:
 *                             type: string
 *                             format: date
 *                           status:
 *                             type: string
 *                     total:
 *                       type: integer
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getMyVehicles = async (ctx) => {
  const { user } = ctx.state;
  
  // 从数据库获取用户的车辆
  // 实际项目中替换为数据库查询
  const vehicles = [
    {
      id: 'v1',
      make: '丰田',
      model: '卡罗拉',
      year: 2020,
      licensePlate: '京A12345',
      vin: 'ABC123456789',
      mileage: 15000,
      lastMaintenanceDate: '2023-01-15',
      status: 'active'
    },
    {
      id: 'v2',
      make: '本田',
      model: '思域',
      year: 2019,
      licensePlate: '京B67890',
      vin: 'DEF987654321',
      mileage: 25000,
      lastMaintenanceDate: '2022-11-20',
      status: 'active'
    }
  ];
  
  ctx.body = {
    status: 'success',
    data: {
      vehicles,
      total: vehicles.length
    }
  };
};

/**
 * @swagger
 * /api/customers/vehicles:
 *   post:
 *     summary: 添加新车辆
 *     description: 为当前登录客户添加新的车辆
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - make
 *               - model
 *               - year
 *               - licensePlate
 *               - vin
 *             properties:
 *               make:
 *                 type: string
 *                 description: 车辆品牌
 *               model:
 *                 type: string
 *                 description: 车辆型号
 *               year:
 *                 type: integer
 *                 description: 车辆年份
 *               licensePlate:
 *                 type: string
 *                 description: 车牌号
 *               vin:
 *                 type: string
 *                 description: 车辆识别号(VIN)
 *               mileage:
 *                 type: integer
 *                 description: 当前里程数
 *               color:
 *                 type: string
 *                 description: 车辆颜色
 *               engineNumber:
 *                 type: string
 *                 description: 发动机编号
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *                 description: 购买日期
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
 *                   example: 车辆添加成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     vehicle:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       409:
 *         description: 车牌号或VIN码已存在
 *       500:
 *         description: 服务器错误
 */
const addVehicle = async (ctx) => {
  const { user } = ctx.state;
  const vehicleData = ctx.request.body;
  
  // 验证车辆数据
  const requiredFields = ['make', 'model', 'year', 'licensePlate', 'vin'];
  
  for (const field of requiredFields) {
    if (!vehicleData[field]) {
      throw createError.validation(`缺少必填字段: ${field}`);
    }
  }
  
  // 验证车牌号格式
  const licensePlateRegex = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5}$/;
  if (!licensePlateRegex.test(vehicleData.licensePlate)) {
    throw createError.validation('车牌号格式不正确');
  }
  
  // 验证VIN码格式
  if (vehicleData.vin.length !== 17) {
    throw createError.validation('VIN码必须为17位');
  }
  
  // 检查是否已存在相同车牌或VIN码
  // 实际项目中替换为数据库查询
  
  // 创建新车辆（保存到数据库）
  const newVehicle = {
    id: 'v' + Date.now(),
    ...vehicleData,
    userId: user.id,
    createdAt: new Date(),
    status: 'active'
  };
  
  logger.info(`用户 ${user.id} 添加了新车辆: ${newVehicle.make} ${newVehicle.model}`);
  
  ctx.status = 201;
  ctx.body = {
    status: 'success',
    message: '车辆添加成功',
    data: {
      vehicle: newVehicle
    }
  };
};

/**
 * @swagger
 * /api/customers/vehicles/{id}:
 *   get:
 *     summary: 获取车辆详情
 *     description: 获取指定车辆的详细信息
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 车辆ID
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
 *                     vehicle:
 *                       type: object
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 车辆不存在
 *       500:
 *         description: 服务器错误
 */
const getVehicleById = async (ctx) => {
  const { user } = ctx.state;
  const vehicleId = ctx.params.id;
  
  // 从数据库获取车辆信息
  // 实际项目中替换为数据库查询
  const vehicle = {
    id: vehicleId,
    make: '丰田',
    model: '卡罗拉',
    year: 2020,
    licensePlate: '京A12345',
    vin: 'ABC123456789',
    mileage: 15000,
    color: '白色',
    engineNumber: 'ENG123456',
    lastMaintenanceDate: '2023-01-15',
    purchaseDate: '2020-05-10',
    insuranceExpiry: '2024-05-10',
    notes: '车况良好',
    status: 'active',
    userId: user.id,
    maintenanceHistory: [
      {
        date: '2022-06-15',
        mileage: 10000,
        description: '常规保养，更换机油和机油滤清器'
      },
      {
        date: '2023-01-15',
        mileage: 15000,
        description: '更换空气滤清器，检查刹车系统'
      }
    ]
  };
  
  // 检查车辆是否存在
  if (!vehicle) {
    throw createError.notFound('未找到该车辆');
  }
  
  // 检查车辆是否属于当前用户
  if (vehicle.userId !== user.id) {
    throw createError.authorization('无权访问该车辆信息');
  }
  
  ctx.body = {
    status: 'success',
    data: {
      vehicle
    }
  };
};

/**
 * @swagger
 * /api/customers/vehicles/{id}:
 *   put:
 *     summary: 更新车辆信息
 *     description: 更新指定车辆的信息
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 车辆ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mileage:
 *                 type: integer
 *                 description: 当前里程数
 *               color:
 *                 type: string
 *                 description: 车辆颜色
 *               notes:
 *                 type: string
 *                 description: 备注信息
 *               lastMaintenanceDate:
 *                 type: string
 *                 format: date
 *                 description: 最近保养日期
 *               insuranceExpiry:
 *                 type: string
 *                 format: date
 *                 description: 保险到期日
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
 *                   example: 车辆信息已更新
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedFields:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权修改
 *       404:
 *         description: 车辆不存在
 *       500:
 *         description: 服务器错误
 */
const updateVehicle = async (ctx) => {
  const { user } = ctx.state;
  const vehicleId = ctx.params.id;
  const updateData = ctx.request.body;
  
  // 获取车辆信息（从数据库）
  // 实际项目中替换为数据库查询
  const vehicle = {
    id: vehicleId,
    make: '丰田',
    model: '卡罗拉',
    userId: user.id
  };
  
  // 检查车辆是否存在
  if (!vehicle) {
    throw createError.notFound('未找到该车辆');
  }
  
  // 检查车辆是否属于当前用户
  if (vehicle.userId !== user.id) {
    throw createError.authorization('无权修改该车辆信息');
  }
  
  // 验证更新数据
  const allowedFields = ['mileage', 'color', 'notes', 'lastMaintenanceDate', 'insuranceExpiry'];
  const updates = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = updateData[key];
    }
  });
  
  if (Object.keys(updates).length === 0) {
    throw createError.validation('没有提供有效的更新字段');
  }
  
  // 更新车辆信息（在数据库中）
  // 实际项目中替换为数据库更新操作
  
  logger.info(`用户 ${user.id} 更新了车辆 ${vehicleId} 的信息`);
  
  ctx.body = {
    status: 'success',
    message: '车辆信息已更新',
    data: {
      updatedFields: Object.keys(updates)
    }
  };
};

/**
 * @swagger
 * /api/customers/vehicles/{id}:
 *   delete:
 *     summary: 删除车辆
 *     description: 删除指定的车辆
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 车辆ID
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
 *                   example: 车辆已删除
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权删除
 *       404:
 *         description: 车辆不存在
 *       409:
 *         description: 车辆有未完成的工单
 *       500:
 *         description: 服务器错误
 */
const deleteVehicle = async (ctx) => {
  const { user } = ctx.state;
  const vehicleId = ctx.params.id;
  
  // 获取车辆信息（从数据库）
  // 实际项目中替换为数据库查询
  const vehicle = {
    id: vehicleId,
    make: '丰田',
    model: '卡罗拉',
    userId: user.id
  };
  
  // 检查车辆是否存在
  if (!vehicle) {
    throw createError.notFound('未找到该车辆');
  }
  
  // 检查车辆是否属于当前用户
  if (vehicle.userId !== user.id) {
    throw createError.authorization('无权删除该车辆');
  }
  
  // 检查车辆是否有未完成的工单
  // 实际项目中替换为数据库查询
  const hasActiveWorkOrders = false;
  
  if (hasActiveWorkOrders) {
    throw createError.conflict('该车辆有未完成的维修工单，无法删除');
  }
  
  // 删除车辆（在数据库中）
  // 实际项目中替换为数据库删除操作
  
  logger.info(`用户 ${user.id} 删除了车辆 ${vehicleId}`);
  
  ctx.body = {
    status: 'success',
    message: '车辆已删除'
  };
};

module.exports = {
  getMyVehicles,
  addVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle
};