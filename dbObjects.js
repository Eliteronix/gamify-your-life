const Sequelize = require('sequelize');

const processQueue = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'databases/processQueue.sqlite',
	retry: {
		max: 25, // Maximum retry 15 times
		backoffBase: 100, // Initial backoff duration in ms. Default: 100,
		backoffExponent: 1.14, // Exponent to increase backoff each try. Default: 1.1
	},
	pool: {
		max: 7,
	}
});

const mainData = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'databases/mainData.sqlite',
	retry: {
		max: 25, // Maximum retry 15 times
		backoffBase: 100, // Initial backoff duration in ms. Default: 100,
		backoffExponent: 1.14, // Exponent to increase backoff each try. Default: 1.1
	},
	pool: {
		max: 7,
	}
});

const DBProcessQueue = require('./models/DBProcessQueue')(processQueue, Sequelize.DataTypes);

const DBCategories = require('./models/DBCategories')(mainData, Sequelize.DataTypes);
const DBGuildSettings = require('./models/DBGuildSettings')(mainData, Sequelize.DataTypes);
const DBTaskCategories = require('./models/DBTaskCategories')(mainData, Sequelize.DataTypes);
const DBTasks = require('./models/DBTasks')(mainData, Sequelize.DataTypes);
const DBTriggers = require('./models/DBTriggers')(mainData, Sequelize.DataTypes);

module.exports = {
	DBProcessQueue,
	DBCategories,
	DBGuildSettings,
	DBTaskCategories,
	DBTasks,
	DBTriggers,
};
