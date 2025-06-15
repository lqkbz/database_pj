const Router = require('koa-router');
const router = new Router({ prefix: '/api/auth' });

// Import auth modules
const { login } = require('../modules/auth/login');
const register = require('../modules/auth/register');
const profile = require('../modules/auth/profile');
const refresh = require('../modules/auth/refresh');

// Login route
router.post('/login', login);

// Register route
router.post('/register', register);

// Profile route (protected route that requires authentication)
router.get('/profile', profile);

// Token refresh route
router.post('/refresh', refresh);

module.exports = router;
