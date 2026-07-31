const { seedDatabase } = require('../seed');

module.exports = async () => {
	await seedDatabase();
};
