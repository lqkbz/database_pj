const Router = require('koa-router');
const router = new Router({ prefix: '/api/admin' });

// Import admin modules
const orders = require('../modules/admin/orders');
const userManagement = require('../modules/admin/userManagement');
const inventory = require('../modules/admin/inventory');

// 调试代码，打印 inventory 对象
console.log('Inventory module exports:', Object.keys(inventory));
console.log('listParts exists:', typeof inventory.listParts === 'function');
console.log('createPart exists:', typeof inventory.createPart === 'function');
console.log('updatePart exists:', typeof inventory.updatePart === 'function');
console.log('deletePart exists:', typeof inventory.deletePart === 'function');

const mechanicManagement = require('../modules/admin/mechanicManagement');
const reports = require('../modules/admin/reports');
const vehiclesWorkorders = require('../modules/admin/vehicles_workorders');
const workload = require('../modules/admin/workload');
const feedback = require('../modules/admin/feedback');
const costStructure = require('../modules/admin/costStructure');
const vehicleRepair = require('../modules/admin/vehicleRepair');
const finance = require('../modules/admin/finance');

// Orders module routes
router.get('/orders/unfinished-stats', orders.getUnfinishedOrdersStats);

// User Management routes
router.get('/users', userManagement.listUsers);
router.get('/users/:id', userManagement.getUserDetail);
router.patch('/users/:id', userManagement.updateUser);

// Inventory routes
router.get('/parts', inventory.listParts);
router.post('/parts', inventory.createPart);
router.put('/parts/:id', inventory.updatePart);
router.delete('/parts/:id', inventory.deletePart);

// Mechanic Management routes
router.get('/mechanics', mechanicManagement.listMechanics);
router.get('/mechanics/:id', mechanicManagement.getMechanicDetail);
router.post('/mechanics', mechanicManagement.createMechanic);
router.patch('/mechanics/:id', mechanicManagement.updateMechanic);

// Vehicles and Work Orders routes
router.get('/vehicles', vehiclesWorkorders.getVehicles);
router.get('/workorders', vehiclesWorkorders.getWorkOrders);
router.get('/workorders/:id', vehiclesWorkorders.getWorkOrderDetail);

// Workload routes
router.get('/workload/statistics', workload.getWorkloadStatistics);
router.get('/workload/distribution', workload.getWorkloadDistribution);

// Feedback routes
router.get('/feedback', feedback.getFeedbackList);
router.get('/feedback/statistics', feedback.getFeedbackStatistics);

// Cost Structure routes
router.get('/costs', costStructure.getCostStructure);
router.post('/costs', costStructure.updateCostItem);

// Vehicle Repair routes
router.get('/repairs/statistics', vehicleRepair.getRepairStatistics);
router.get('/repairs/common-issues', vehicleRepair.getCommonIssues);

// Finance routes
router.get('/finance/summary', finance.getFinancialSummary);
router.get('/finance/revenue', finance.getRevenueBreakdown);
router.get('/finance/expenses', finance.getExpenseBreakdown);

// Reports routes (if any functions are available)
// router.get('/reports/:type', reports.getReport);

module.exports = router;
