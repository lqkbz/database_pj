const Router = require('koa-router');
const router = new Router({ prefix: '/api/mechanic' });

// Import mechanic modules
const { getMyProfile, updateMyProfile } = require('../modules/mechanic/mechanicProfile');
const { getMonthlyIncome } = require('../modules/mechanic/mechanicIncome');
const { 
  getMyWorkOrders, 
  acceptWorkOrder, 
  refuseWorkOrder, 
  updateWorkOrderProgress, 
  recordWorkOrderMaterials, 
  completeWorkOrder 
} = require('../modules/mechanic/mechanicWordOrders');

// Profile routes
router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);

// Income routes
router.get('/income/monthly', getMonthlyIncome);

// Work order routes
router.get('/workorders', getMyWorkOrders);
router.post('/workorders/:id/accept', acceptWorkOrder);
router.post('/workorders/:id/refuse', refuseWorkOrder);
router.post('/workorders/:id/progress', updateWorkOrderProgress);
router.post('/workorders/:id/materials', recordWorkOrderMaterials);
router.post('/workorders/:id/complete', completeWorkOrder);

module.exports = router;
