/* module.exports = {
  createUserSheet: `createUserSheet`,
  chouseWorkout: `chouseWorkout`,
  startWorkout: `startWorkout`,
  createWorkout: `createWorkout`,
}; */

const startWorkout = require('./startWorkout');
const createWorkout = require('./createWorkout');
const chouseWorkout = require('./chouseWorkout');
const createUserSheet = require('./createUserSheet');

console.log({ID: chouseWorkout.id})

module.exports = {
  createUserSheet,
  chouseWorkout: require('./chouseWorkout'),
  startWorkout,
  createWorkout,
};
