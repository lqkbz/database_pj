/**
 * 用户控制器 - User Controller
 * 含有 Swagger JSDoc 注释的示例控制器
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: 用户ID
 *         name:
 *           type: string
 *           description: 用户名称
 *         email:
 *           type: string
 *           format: email
 *           description: 用户邮箱
 *         age:
 *           type: integer
 *           description: 用户年龄
 *       example:
 *         id: "1"
 *         name: "张三"
 *         email: "zhangsan@example.com"
 *         age: 28
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 获取所有用户
 *     description: 返回系统中的所有用户列表
 *     tags: [users]
 *     responses:
 *       200:
 *         description: 用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
const getUsers = async (ctx) => {
  // 模拟数据
  const users = [
    { id: '1', name: '张三', email: 'zhangsan@example.com', age: 28 },
    { id: '2', name: '李四', email: 'lisi@example.com', age: 32 },
    { id: '3', name: '王五', email: 'wangwu@example.com', age: 25 }
  ];
  
  ctx.body = users;
};

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: 获取单个用户
 *     description: 通过ID获取用户详情
 *     tags: [users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 用户详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: 用户不存在
 */
const getUserById = async (ctx) => {
  const { id } = ctx.params;
  
  // 模拟数据
  const users = [
    { id: '1', name: '张三', email: 'zhangsan@example.com', age: 28 },
    { id: '2', name: '李四', email: 'lisi@example.com', age: 32 },
    { id: '3', name: '王五', email: 'wangwu@example.com', age: 25 }
  ];
  
  const user = users.find(u => u.id === id);
  
  if (!user) {
    ctx.status = 404;
    ctx.body = { message: '用户不存在' };
    return;
  }
  
  ctx.body = user;
};

/**
 * @swagger
 * /users:
 *   post:
 *     summary: 创建用户
 *     description: 添加新用户到系统
 *     tags: [users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               age:
 *                 type: integer
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: 无效请求
 */
const createUser = async (ctx) => {
  const userData = ctx.request.body;
  
  // 简单验证
  if (!userData.name || !userData.email) {
    ctx.status = 400;
    ctx.body = { message: '名称和邮箱是必填项' };
    return;
  }
  
  // 模拟创建用户
  const newUser = {
    id: Date.now().toString(),
    ...userData
  };
  
  ctx.status = 201;
  ctx.body = newUser;
};

module.exports = {
  getUsers,
  getUserById,
  createUser
}; 