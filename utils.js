const { DBProcessQueue, DBCategories, DBTasks, DBTaskCategories } = require('./dbObjects');
const { Op } = require('sequelize');

module.exports = {
	executeNextProcessQueueTask: async function (client) {
		let now = new Date();
		let nextTasks = await DBProcessQueue.findAll({
			where: {
				beingExecuted: false,
				date: {
					[Op.lt]: now
				}
			},
			order: [
				['date', 'ASC'],
			]
		});

		for (let i = 0; i < nextTasks.length; i++) {
			nextTasks[i].beingExecuted = true;
			await nextTasks[i].save();

			executeFoundTask(client, nextTasks[i]);
			break;
		}
	},
	async updateGuildDisplay(guild) {
		let categories = await DBCategories.findAll({
			where: {
				guildId: guild.id
			}
		});

		let tasks = await DBTasks.findAll({
			where: {
				guildId: guild.id
			}
		});

		let categoryNames = categories.map(c => c.name).sort();

		categoryNames.unshift('uncategorized');

		let taskCategoryConnections = await DBTaskCategories.findAll({
			where: {
				guildId: guild.id
			}
		});

		// Create open and done discord categories
		let openCategory = guild.channels.cache.find(c => c.name === 'open');

		if (!openCategory) {
			openCategory = await guild.channels.create('open', {
				type: 'GUILD_CATEGORY'
			});
		}

		let doneCategory = guild.channels.cache.find(c => c.name === 'done');

		if (!doneCategory) {
			doneCategory = await guild.channels.create('done', {
				type: 'GUILD_CATEGORY'
			});
		}

		// Create category channels under open and done
		let categoryChannels = guild.channels.cache.filter(c => c.type === 'GUILD_TEXT');

		for (let i = 0; i < categoryNames.length; i++) {
			let doneCategoryChannel = categoryChannels.find(c => c.name === categoryNames[i]);

			if (!category) {
				category = await guild.channels.create(categoryNames[i], {
					type: 'GUILD_TEXT',
					parent: openCategory
				});
			}
		}
	}
};

async function executeFoundTask(client, nextTask) {
	try {
		if (nextTask) {
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