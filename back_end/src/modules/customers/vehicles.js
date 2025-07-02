const { User, Vehicle, WorkOrder } = require('../../models');
const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');
const { Op } = require('sequelize');

const logger = createLogger('CustomerVehicles');

/**
 * @swagger
 * /api/customers/vehicles:
 *   get:
 *     summary: 获取当前客户的车辆列表
 *     description: 获取当前登录客户的所有车辆
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
 *                           model:
 *                             type: string
 *                           year:
 *                             type: integer
 *                           licensePlate:
 *                             type: string
 *                           vin:
 *                             type: string
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
const getMyVehicles = async (ctx) => {
  try {
    const { user } = ctx.state;
    
    // 从数据库获取用户的车辆列表
    const vehicles = await Vehicle.findAll({
      where: { user_id: user.id },
      attributes: [
        'vehicle_id',
        'model', 
        'year',
        'plate_no',
        'vin'
      ],
      order: [['vehicle_id', 'DESC']]
    });
    
    // 格式化返回数据
    const formattedVehicles = vehicles.map(vehicle => ({
      id: vehicle.vehicle_id,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.plate_no,
      vin: vehicle.vin,
      status: 'active' // 目前所有车辆都是active状态
    }));
    
    logger.info(`用户 ${user.id} 获取了车辆列表，共 ${vehicles.length} 辆车`);
    
    ctx.body = {
      status: 'success',
      data: {
        vehicles: formattedVehicles,
        total: vehicles.length
      }
    };
  } catch (error) {
    logger.error(`获取车辆列表失败: ${error.message}`);
    throw createError.internal('获取车辆列表失败');
  }
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
 *               - model
 *               - year
 *               - licensePlate
 *               - vin
 *             properties:
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
  try {
    const { user } = ctx.state;
    const vehicleData = ctx.request.body;
    
    // 验证车辆数据
    const requiredFields = ['model', 'year', 'licensePlate', 'vin'];
    
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
    const existingVehicle = await Vehicle.findOne({
      where: {
        [Op.or]: [
          { plate_no: vehicleData.licensePlate },
          { vin: vehicleData.vin }
        ]
      }
    });
    
    if (existingVehicle) {
      if (existingVehicle.plate_no === vehicleData.licensePlate) {
        throw createError.conflict('该车牌号已被注册');
      }
      if (existingVehicle.vin === vehicleData.vin) {
        throw createError.conflict('该VIN码已被注册');
      }
    }
    
    // 创建新车辆
    const newVehicle = await Vehicle.create({
      user_id: user.id,
      model: vehicleData.model,
      year: vehicleData.year,
      plate_no: vehicleData.licensePlate,
      vin: vehicleData.vin
    });
    
    logger.info(`用户 ${user.id} 添加了新车辆: ${newVehicle.model} (${newVehicle.plate_no})`);
    
    ctx.status = 201;
    ctx.body = {
      status: 'success',
      message: '车辆添加成功',
      data: {
        vehicle: {
          id: newVehicle.vehicle_id,
          model: newVehicle.model,
          year: newVehicle.year,
          licensePlate: newVehicle.plate_no,
          vin: newVehicle.vin
        }
      }
    };
  } catch (error) {
    logger.error(`添加车辆失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    // 处理数据库约束错误
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw createError.conflict('车牌号或VIN码已存在');
    }
    
    throw createError.internal('添加车辆失败');
  }
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
  try {
    const { user } = ctx.state;
    const vehicleId = ctx.params.id;
    
    // 从数据库获取车辆信息及其维修历史
    const vehicle = await Vehicle.findOne({
      where: { vehicle_id: vehicleId },
      include: [
        {
          model: WorkOrder,
          as: 'workOrders',
          attributes: ['order_id', 'description', 'status', 'created_at', 'finished_at'],
          where: { status: 'done' },
          required: false,
          order: [['created_at', 'DESC']]
        }
      ]
    });
    
    // 检查车辆是否存在
    if (!vehicle) {
      throw createError.notFound('未找到该车辆');
    }
    
    // 检查车辆是否属于当前用户
    if (vehicle.user_id !== user.id) {
      throw createError.authorization('无权访问该车辆信息');
    }
    
    // 构建维修历史
    const maintenanceHistory = vehicle.workOrders ? vehicle.workOrders.map(order => ({
      date: order.created_at,
      completedDate: order.finished_at,
      description: order.description,
      orderId: order.order_id
    })) : [];
    
    const vehicleDetails = {
      id: vehicle.vehicle_id,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.plate_no,
      vin: vehicle.vin,
      status: 'active',
      maintenanceHistory
    };
    
    logger.info(`用户 ${user.id} 查看了车辆 ${vehicleId} 的详情`);
    
    ctx.body = {
      status: 'success',
      data: {
        vehicle: vehicleDetails
      }
    };
  } catch (error) {
    logger.error(`获取车辆详情失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('获取车辆详情失败');
  }
};

/**
 * @swagger
 * /api/customers/vehicles/{id}:
 *   put:
 *     summary: 更新车辆信息
 *     description: 更新指定车辆的信息（仅支持更新车型和年份）
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
 *               model:
 *                 type: string
 *                 description: 车辆型号
 *               year:
 *                 type: integer
 *                 description: 车辆年份
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
  try {
    const { user } = ctx.state;
    const vehicleId = ctx.params.id;
    const updateData = ctx.request.body;
    
    // 获取车辆信息
    const vehicle = await Vehicle.findOne({
      where: { vehicle_id: vehicleId },
      attributes: ['vehicle_id', 'user_id', 'model', 'year']
    });
    
    // 检查车辆是否存在
    if (!vehicle) {
      throw createError.notFound('未找到该车辆');
    }
    
    // 检查车辆是否属于当前用户
    if (vehicle.user_id !== user.id) {
      throw createError.authorization('无权修改该车辆信息');
    }
    
    // 验证更新数据
    const allowedFields = ['model', 'year'];
    const updates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      throw createError.validation('没有提供有效的更新字段');
    }
    
    // 验证年份
    if (updates.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (typeof updates.year !== 'number' || updates.year < 1900 || updates.year > currentYear + 1) {
        throw createError.validation(`年份必须在1900到${currentYear + 1}之间`);
      }
    }
    
    // 更新车辆信息
    await Vehicle.update(updates, {
      where: { vehicle_id: vehicleId }
    });
    
    logger.info(`用户 ${user.id} 更新了车辆 ${vehicleId} 的信息: ${Object.keys(updates).join(', ')}`);
    
    ctx.body = {
      status: 'success',
      message: '车辆信息已更新',
      data: {
        updatedFields: Object.keys(updates)
      }
    };
  } catch (error) {
    logger.error(`更新车辆信息失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('更新车辆信息失败');
  }
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
  try {
    const { user } = ctx.state;
    const vehicleId = ctx.params.id;
    
    // 获取车辆信息
    const vehicle = await Vehicle.findOne({
      where: { vehicle_id: vehicleId },
      attributes: ['vehicle_id', 'user_id', 'model', 'plate_no']
    });
    
    // 检查车辆是否存在
    if (!vehicle) {
      throw createError.notFound('未找到该车辆');
    }
    
    // 检查车辆是否属于当前用户
    if (vehicle.user_id !== user.id) {
      throw createError.authorization('无权删除该车辆');
    }
    
    // 检查是否有未完成的工单
    const pendingOrders = await WorkOrder.count({
      where: {
        vehicle_id: vehicleId,
        status: { [Op.in]: ['pending', 'in_progress'] }
      }
    });
    
    if (pendingOrders > 0) {
      throw createError.conflict('该车辆有未完成的工单，无法删除');
    }
    
    // 删除车辆
    await Vehicle.destroy({
      where: { vehicle_id: vehicleId }
    });
    
    logger.info(`用户 ${user.id} 删除了车辆: ${vehicle.model} (${vehicle.plate_no})`);
    
    ctx.body = {
      status: 'success',
      message: '车辆已删除'
    };
  } catch (error) {
    logger.error(`删除车辆失败: ${error.message}`);
    
    if (error.isOperational) {
      throw error;
    }
    
    throw createError.internal('删除车辆失败');
  }
};

module.exports = {
  getMyVehicles,
  addVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle
};