const health = require('./health');
const docs = require('./docs');
const static = require('./static');
 
module.exports = {
  ...health,
  ...docs,
  ...static
}; 