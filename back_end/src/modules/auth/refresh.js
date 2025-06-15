/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     description: 使用刷新令牌生成新的访问令牌
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌
 *     responses:
 *       200:
 *         description: 令牌刷新成功
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
 *                   example: 令牌刷新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 新的访问令牌
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 无效的刷新令牌
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
const { verifyToken, generateToken } = require('../../utils/jwt');
const { createError } = require('../../middleware/errorhandler');

/**
 * 刷新令牌控制器
 * 
 * 使用刷新令牌生成新的访问令牌
 * 
 * @param {Object} ctx - Koa上下文
 */
module.exports = async (ctx) => {
  const { refreshToken } = ctx.request.body;
  
  if (!refreshToken) {
    throw createError.validation('刷新令牌不能为空');
  }
  
  // 验证刷新令牌
  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch (error) {
    throw createError.authentication('无效的刷新令牌');
  }
  
  // 确保是刷新令牌
  if (decoded.type !== 'refresh') {
    throw createError.authentication('提供的不是刷新令牌');
  }
  
  // 获取用户信息
  // 注意：这里需要连接到实际的数据库
  // 以下是模拟代码，实际项目中应替换为数据库操作
  const user = { 
    id: decoded.id,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  };
  
  if (!user) {
    throw createError.notFound('用户不存在');
  }
  
  // 生成新的访问令牌
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };
  
  const accessToken = generateToken(payload, 'access');
  
  // 返回成功响应和新令牌
  ctx.status = 200;
  ctx.body = {
    status: 'success',
    message: '令牌刷新成功',
    data: {
      accessToken
    }
  };
};
