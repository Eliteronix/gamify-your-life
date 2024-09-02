const { DBProcessQueue, DBCategories, DBTasks, DBTaskCategories, DBGuildSettings } = require('./dbObjects');
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

				if (openCategoryTasks[j].type === 1) {
					messageToSend = `**${openCategoryTasks[j].name}**`;
				} else if (openCategoryTasks[j].type === 2) {
					messageToSend = `**${openCategoryTasks[j].name}** - ${openCategoryTasks[j].amount}`;
				}

				if (openCategoryTasks[j].dateLastDone) {
					messageToSend = messageToSend + ` - last done <t:${parseInt(openCategoryTasks[j].dateLastDone.getTime() / 1000)}:R>`;
				}

				if (openCategoryTasks[j].dateReopen) {
					messageToSend = messageToSend + ` - reopened <t:${parseInt(openCategoryTasks[j].dateReopen.getTime() / 1000)}:R>`;
				} else {
					messageToSend = messageToSend + ' - Did not reopen automatically';
				}

				let openCategoryMessage = openCategoryMessages.find(m => m.content === messageToSend);

				// Remove the message from the array so we can check if we need to delete it later
				openCategoryMessages = openCategoryMessages.filter(m => m.content !== messageToSend);


				if (!openCategoryMessage) {
					openCategoryMessage = await openCategoryChannel.send(messageToSend);

					openCategoryMessage.react('✅');
				}
			}

			// Delete any messages that are left in the array
			// eslint-disable-next-line no-unused-vars
			for (const [key, value] of openCategoryMessages) {
				await value.delete();
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

				if (doneCategoryTasks[j].type === 1) {
					messageToSend = `**${doneCategoryTasks[j].name}** - Done <t:${parseInt(doneCategoryTasks[j].dateLastDone.getTime() / 1000)}:R>`;
				} else if (doneCategoryTasks[j].type === 2) {
					messageToSend = `**${doneCategoryTasks[j].name}** - ${doneCategoryTasks[j].amount} - Done <t:${parseInt(doneCategoryTasks[j].dateLastDone.getTime() / 1000)}:R>`;
				}

				if (doneCategoryTasks[j].dateReopen) {
					messageToSend = messageToSend + ` - reopens <t:${parseInt(doneCategoryTasks[j].dateReopen.getTime() / 1000)}:R>`;
				} else {
					messageToSend = messageToSend + ' - Does not reopen automatically';
				}

				let doneCategoryMessage = doneCategoryMessages.find(m => m.content === messageToSend);

				// Remove the message from the array so we can check if we need to delete it later
				doneCategoryMessages = doneCategoryMessages.filter(m => m.content !== messageToSend);

				if (!doneCategoryMessage) {
					doneCategoryMessage = await doneCategoryChannel.send(messageToSend);

					doneCategoryMessage.react('🔄');
				}
			}

			// Delete any messages that are left in the array
			// eslint-disable-next-line no-unused-vars
			for (const [key, value] of doneCategoryMessages) {
				await value.delete();
			}
		}
	},
	async reopenRelevantTasks(client) {
		let tasks = await DBTasks.findAll({
			attributes: ['id', 'guildId'],
			where: {
				dateReopen: {
					[Op.lt]: new Date()
				},
				done: true
			}
		});

		for (let i = 0; i < tasks.length; i++) {
			tasks[i].done = false;

			await tasks[i].save();
		}

		let guildsToUpdate = [...new Set(tasks.map(t => t.guildId))];

		for (let i = 0; i < guildsToUpdate.length; i++) {
			let guild = await client.guilds.fetch(guildsToUpdate[i]);

			await module.exports.updateGuildDisplay(guild);
		}
	},
	async markTaskAsDone(task, guildId) {
		task.done = true;
		task.dateLastDone = new Date();

		task.dateReopen = new Date();

		if (task.resetEveryHours) {
			task.dateReopen.setHours(task.dateReopen.getHours() + task.resetEveryHours);
		} else if (task.resetEveryDays) {
			let guildSettings = await DBGuildSettings.findOne({
				attributes: ['dailyResetTime'],
				where: {
					guildId: guildId,
				},
			});

			if (!guildSettings) {
				guildSettings = await DBGuildSettings.create({
					guildId: guildId,
					dailyResetTime: 5,
				});
			}

			task.dateReopen = new Date();

			task.dateReopen.setMinutes(0);
			task.dateReopen.setSeconds(0);
			task.dateReopen.setMilliseconds(0);

			task.dateReopen.setUTCHours(guildSettings.dailyResetTime);

			// If the reset time is in the future, set it to the previous day
			if (task.dateReopen > new Date()) {
				task.dateReopen.setDate(task.dateReopen.getDate() - 1);
			}

			task.dateReopen.setDate(task.dateReopen.getDate() + task.resetEveryDays);
		} else {
			task.dateReopen = null;
		}

		await task.save();
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