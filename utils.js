const { DBProcessQueue } = require('./dbObjects');
const { Op } = require('sequelize');

module.exports = {
	executeNextProcessQueueTask: async function (client) {
		let now = new Date();
		module.exports.logDatabaseQueries(1, 'utils.js DBProcessQueue nextTask');
		let nextTasks = await DBProcessQueue.findAll({
			where: {
				beingExecuted: false,
				date: {
					[Op.lt]: now
				}
			},
			order: [
				['priority', 'DESC'],
				['date', 'ASC'],
			]
		});

		for (let i = 0; i < nextTasks.length; i++) {
			if (!module.exports.wrongCluster(client, nextTasks[i].id)) {
				nextTasks[i].beingExecuted = true;
				await nextTasks[i].save();

				executeFoundTask(client, nextTasks[i]);
				break;
			}
		}
	},
};

async function executeFoundTask(client, nextTask) {
	try {
		if (nextTask && !module.exports.wrongCluster(client, nextTask.id)) {
			const task = require(`./processQueueTasks/${nextTask.task}.js`);

			await task.execute(client, nextTask);
		}
	} catch (e) {
		console.error('Error executing process queue task', e);
		nextTask.beingExecuted = false;
		await new Promise(resolve => setTimeout(resolve, 10000));
		try {
			await nextTask.save();
		} catch (e) {
			await new Promise(resolve => setTimeout(resolve, 10000));
			await nextTask.save();
		}
	}
}