const { createError } = require('../../middleware/errorhandler');
const { createLogger } = require('../../middleware/logger');

const logger = createLogger('AdminUserManagement');

/**
 * 获取所有用户列表
 * 
 * @param {Object} ctx - Koa上下文
 */
const listUsers = async (ctx) => {
  const { page = 1, limit = 10, search, status } = ctx.query;
  
  // 构建查询条件
  const query = {};
  if (search) {
    // 实际项目中替换为搜索条件
    query.search = search;
  }
  
  if (status) {
    query.status = status;
  }
  
  // 从数据库获取用户列表
  // 实际项目中替换为数据库查询
  const users = [
    {
      id: 'user1',
      username: 'zhangsan',
      email: 'zhangsan@example.com',
      fullName: '张三',
      phone: '13800138000',
      role: 'customer',
      status: 'active',
      createdAt: '2023-01-15T08:30:00Z',
      vehicleCount: 2,
      orderCount: 5
    },
    {
      id: 'user2',
      username: 'lisi',
      email: 'lisi@example.com',
      fullName: '李四',
      phone: '13900001111',
      role: 'customer',
      status: 'active',
      createdAt: '2023-02-20T14:45:00Z',
      vehicleCount: 1,
      orderCount: 3
    },
    {
      id: 'user3',
      username: 'wangwu',
      email: 'wangwu@example.com',
      fullName: '王五',
      phone: '13700002222',
      role: 'customer',
      status: 'inactive',
      createdAt: '2023-03-10T11:20:00Z',
      vehicleCount: 0,
      orderCount: 0
    }
  ];
  
  // 计算总用户数
  const total = users.length;
  
  logger.info(`管理员查询了用户列表，返回 ${users.length} 条记录`);
  
  ctx.body = {
    status: 'success',
    data: {
      users,
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
 * 获取用户详情
 * 
 * @param {Object} ctx - Koa上下文
 */
const getUserDetail = async (ctx) => {
  const userId = ctx.params.id;
  
  // 从数据库获取用户详情
  // 实际项目中替换为数据库查询
  const user = {
    id: userId,
    username: 'zhangsan',
    email: 'zhangsan@example.com',
    fullName: '张三',
    phone: '13800138000',
    address: '北京市朝阳区XX街XX号',
    role: 'customer',
    status: 'active',
    createdAt: '2023-01-15T08:30:00Z',
    lastLogin: '2023-05-20T09:45:00Z',
    vehicles: [
      {
        id: 'v1',
        make: '丰田',
        model: '卡罗拉',
        licensePlate: '京A12345',
        year: 2020
      },
      {
        id: 'v2',
        make: '本田',
        model: '思域',
        licensePlate: '京B67890',
        year: 2019
      }
    ],
    recentOrders: [
      {
        id: 'wo1',
        description: '发动机异响，怠速不稳',
        status: 'completed',
        createdAt: '2023-04-15T08:30:00Z',
        completedAt: '2023-04-16T15:45:00Z'
      },
      {
        id: 'wo2',
        description: '更换刹车片，更换机油',
        status: 'in_progress',
        createdAt: '2023-05-10T09:15:00Z'
      }
    ]
  };
  
  // 检查用户是否存在
  if (!user) {
    throw createError.notFound('用户不存在');
  }
  
  logger.info(`管理员查看了用户 ${userId} 的详细信息`);
  
  ctx.body = {
    status: 'success',
    data: {
      user
    }
  };
};

/**
 * 更新用户信息
 * 
 * @param {Object} ctx - Koa上下文
 */
const updateUser = async (ctx) => {
  const userId = ctx.params.id;
  const updateData = ctx.request.body;
  
  // 获取用户信息（从数据库）
  // 实际项目中替换为数据库查询
  const user = {
    id: userId,
    username: 'zhangsan',
    status: 'active'
  };
  
  // 检查用户是否存在
  if (!user) {
    throw createError.notFound('用户不存在');
  }
  
  // 验证更新数据
  const allowedFields = ['fullName', 'phone', 'address', 'email', 'status', 'role'];
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
  
  if (updates.role && !['customer', 'mechanic', 'admin'].includes(updates.role)) {
    throw createError.validation('无效的角色值');
  }
  
  // 更新用户信息（在数据库中）
  // 实际项目中替换为数据库更新操作
  
  logger.info(`管理员更新了用户 ${userId} 的信息`);
  
  ctx.body = {
    status: 'success',
    message: '用户信息已更新',
    data: {
      userId,
      updatedFields: Object.keys(updates)
    }
  };
};

module.exports = {
  listUsers,
  getUserDetail,
  updateUser
};