/**
 * 获取用户个人资料控制器
 * 
 * 获取当前已认证用户的个人资料信息
 * 
 * @param {Object} ctx - Koa上下文
 */
module.exports = async (ctx) => {
  try {
    // 从ctx.state获取用户信息（由认证中间件设置）
    const { user } = ctx.state;
    
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        status: 'error',
        message: '未认证的用户'
      };
      return;
    }
    
    // 获取完整的用户信息
    // 注意：这里需要连接到实际的数据库
    // 以下是模拟代码，实际项目中应替换为数据库操作
    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: new Date('2023-01-01'),
      lastLogin: new Date(),
      // 其他个人资料信息
      profile: {
        fullName: '测试用户',
        avatar: 'https://example.com/avatar.jpg',
        bio: '这是一个测试用户账号',
        phone: '13800138000'
      }
    };
    
    // 返回用户资料信息，不包含敏感数据
    ctx.status = 200;
    ctx.body = {
      status: 'success',
      data: {
        user: {
          id: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          role: userProfile.role,
          createdAt: userProfile.createdAt,
          lastLogin: userProfile.lastLogin,
          profile: userProfile.profile
        }
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      status: 'error',
      message: '获取用户资料过程中发生错误',
      error: error.message
    };
  }
};
