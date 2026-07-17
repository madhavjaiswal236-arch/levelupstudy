const { format } = require('date-fns');
const date = new Date();
date.setHours(9, 30, 0, 0);
console.log(format(date, 'HH:mm'));
