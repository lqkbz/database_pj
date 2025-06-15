const Router = require('koa-router');
const router = new Router({ prefix: '/api/customers' });

// Import customer modules
const { getMyProfile, updateMyProfile } = require('../modules/customers/userProfile');
const { getMyVehicles, addVehicle, getVehicleById, updateVehicle, deleteVehicle } = require('../modules/customers/vehicles');
const { getMyWorkOrders, createWorkOrder, getWorkOrderById, addWorkOrderFeedback, urgeWorkOrder } = require('../modules/customers/workOrder');

// User profile routes
router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);

// Vehicle routes
router.get('/vehicles', getMyVehicles);
router.post('/vehicles', addVehicle);
router.get('/vehicles/:id', getVehicleById);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);

// Work order routes
router.get('/workorders', getMyWorkOrders);
router.post('/workorders', createWorkOrder);
router.get('/workorders/:id', getWorkOrderById);
router.post('/workorders/:id/feedback', addWorkOrderFeedback);
router.post('/workorders/:id/urge', urgeWorkOrder);

module.exports = router;
