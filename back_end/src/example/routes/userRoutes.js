/**
 * 用户路由 - User Routes
 */

const Router = require('@koa/router');
const userController = require('../controllers/userController');

const router = new Router({
  prefix: '/example/users'
});

// 获取所有用户
router.get('/', userController.getUsers);

// 获取单个用户
router.get('/:id', userController.getUserById);

// 创建用户
router.post('/', userController.createUser);

module.exports = router; 