const vehicleRepair = require('./vehicleRepair');
const costStructure = require('./costStructure');
const feedback = require('./feedback');
const orders = require('./orders');
const workload = require('./workload');

module.exports = {
  ...vehicleRepair,
  ...costStructure,
  ...feedback,
  ...orders,
  ...workload
}; 