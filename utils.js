const { DBProcessQueue, DBCategories, DBTasks, DBTaskCategories } = require('./dbObjects');
const { Op } = require('sequelize');
const { ChannelType } = require('discord.js');

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

		for (let i = 0; i < categoryNames.length; i++) {
			categoryNames[i] = categoryNames[i].replace(/ +/gm, '-').toLowerCase();
		}

		let taskCategoryConnections = await DBTaskCategories.findAll({
			where: {
				guildId: guild.id
			}
		});

		// Create open and done discord categories
		let openCategory = guild.channels.cache.find(c => c.name === 'open');

		if (!openCategory) {
			openCategory = await guild.channels.create({
				name: 'open',
				type: ChannelType.GuildCategory
			});
		}

		let doneCategory = guild.channels.cache.find(c => c.name === 'done');

		if (!doneCategory) {
			doneCategory = await guild.channels.create({
				name: 'done',
				type: ChannelType.GuildCategory
			});
		}

		// Create category channels under open and done
		let openCategoryChannels = openCategory.children.cache.filter(c => c.type === ChannelType.GuildText);

		let doneCategoryChannels = doneCategory.children.cache.filter(c => c.type === ChannelType.GuildText);

		for (let i = 0; i < categoryNames.length; i++) {
			let tasksInCategory = [];

			if (categoryNames[i] === 'uncategorized') {
				tasksInCategory = tasks.filter(t => taskCategoryConnections.filter(tc => tc.taskId === t.id).length === 0);
			} else {
				let categoryId = categories.find(c => c.name.replace(/ +/gm, '-').toLowerCase() === categoryNames[i]).id;

				tasksInCategory = tasks.filter(t => taskCategoryConnections.find(tc => tc.taskId === t.id && tc.categoryId === categoryId));
			}

			let openCategoryChannel = openCategoryChannels.find(c => c.name === categoryNames[i]);

			if (!openCategoryChannel) {
				openCategoryChannel = await guild.channels.create({
					name: categoryNames[i],
					type: ChannelType.GuildText,
					parent: openCategory
				});
			}

			let openCategoryTasks = tasksInCategory.filter(t => !t.done);

			let openCategoryMessages = await openCategoryChannel.messages.fetch();

			for (let j = 0; j < openCategoryTasks.length; j++) {
				let messageToSend = '';

				switch (openCategoryTasks[j].type) {
					case 1:
						messageToSend = `**${openCategoryTasks[j].name}**`;
						break;
					case 2:
						messageToSend = `**${openCategoryTasks[j].name}** - ${openCategoryTasks[j].amount}`;
				}

				let openCategoryMessage = openCategoryMessages.find(m => m.content === messageToSend);

				// Remove the message from the array so we can check if we need to delete it later
				openCategoryMessages = openCategoryMessages.filter(m => m.content !== messageToSend);


				if (!openCategoryMessage) {
					openCategoryMessage = await openCategoryChannel.send(messageToSend);
				}
			}

			// Delete any messages that are left in the array
			for (let j = 0; j < openCategoryMessages.length; j++) {
				await openCategoryMessages[j].delete();
			}

			let doneCategoryChannel = doneCategoryChannels.find(c => c.name === categoryNames[i]);

			if (!doneCategoryChannel) {
				doneCategoryChannel = await guild.channels.create({
					name: categoryNames[i],
					type: ChannelType.GuildText,
					parent: doneCategory
				});
			}

			let doneCategoryTasks = tasksInCategory.filter(t => t.done);

			let doneCategoryMessages = await doneCategoryChannel.messages.fetch();

			for (let j = 0; j < doneCategoryTasks.length; j++) {
				let messageToSend = '';

				switch (doneCategoryTasks[j].type) {
					case 1:
						messageToSend = `**${doneCategoryTasks[j].name}**`;

						break;
					case 2:
						messageToSend = `**${doneCategoryTasks[j].name}** - ${doneCategoryTasks[j].amount}`;
				}

				let doneCategoryMessage = doneCategoryMessages.find(m => m.content === messageToSend);

				// Remove the message from the array so we can check if we need to delete it later
				doneCategoryMessages = doneCategoryMessages.filter(m => m.content !== messageToSend);

				if (!doneCategoryMessage) {
					doneCategoryMessage = await doneCategoryChannel.send(messageToSend);
				}
			}

			// Delete any messages that are left in the array
			for (let j = 0; j < doneCategoryMessages.length; j++) {
				await doneCategoryMessages[j].delete();
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