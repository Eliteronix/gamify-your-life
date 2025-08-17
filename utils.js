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

		let categoryNames = categories.map(c => c.name);

		categoryNames.unshift('uncategorized');

		for (let i = 0; i < categoryNames.length; i++) {
			categoryNames[i] = categoryNames[i].replace(/ +/gm, '-').toLowerCase();
		}

		let taskCategoryConnections = await DBTaskCategories.findAll({
			where: {
				guildId: guild.id
			}
		});

		// Create stats, open and done discord categories
		let statsCategory = guild.channels.cache.find(c => c.name === 'stats');

		if (!statsCategory) {
			statsCategory = await guild.channels.create({
				name: 'stats',
				type: ChannelType.GuildCategory
			});
		}

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
		let statsCategoryChannels = statsCategory.children.cache.filter(c => c.type === ChannelType.GuildVoice);

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

			let statsCategoryChannel = statsCategoryChannels.find(c => c.name.startsWith(`${categoryNames[i]} |`));

			if (!statsCategoryChannel) {
				statsCategoryChannel = await guild.channels.create({
					name: `${categoryNames[i]} |`,
					type: ChannelType.GuildVoice,
					parent: statsCategory
				});
			}

			let percentageDone = 'None';

			if (tasksInCategory.length > 0) {
				if (categoryNames[i] === 'uncategorized') {
					percentageDone = (tasksInCategory.filter(t => t.done).length / tasksInCategory.length * 100).toFixed(0) + '%';
				} else {
					let totalWeight = 0;
					let doneWeight = 0;

					for (let j = 0; j < tasksInCategory.length; j++) {
						let taskCategoryConnection = taskCategoryConnections.find(tc => tc.taskId === tasksInCategory[j].id && tc.categoryId === categories[i - 1].id);

						tasksInCategory[j].weight = taskCategoryConnection.weight;
						tasksInCategory[j].weightType = taskCategoryConnection.type;

						totalWeight += taskCategoryConnection.weight;

						if (tasksInCategory[j].done) {
							doneWeight += taskCategoryConnection.weight;
						}
					}

					percentageDone = (doneWeight / totalWeight * 100).toFixed(0) + '%';
				}
			}

			statsCategoryChannel.setName(`${categoryNames[i]} | ${percentageDone}`);

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
				let messageToSend = `**${openCategoryTasks[j].name}**`;

				if (openCategoryTasks[j].type === 2) {
					messageToSend = `${messageToSend} - ${openCategoryTasks[j].amount}`;
				}

				if (openCategoryTasks[j].dateLastDone) {
					messageToSend = messageToSend + ` - last done <t:${parseInt(openCategoryTasks[j].dateLastDone.getTime() / 1000)}:R>`;
				}

				if (openCategoryTasks[j].dateReopen) {
					messageToSend = messageToSend + ` - reopened <t:${parseInt(openCategoryTasks[j].dateReopen.getTime() / 1000)}:R>`;
				} else {
					messageToSend = messageToSend + ' - Did not reopen automatically';
				}

				messageToSend = messageToSend + ` - Weight: ${openCategoryTasks[j].weight}`;

				if (openCategoryTasks[j].type === 2) {
					if (openCategoryTasks[j].weightType === 1) {
						messageToSend = `${messageToSend} - Absolute`;
					} else {
						messageToSend = `${messageToSend} - Relative`;
					}
				}

				let openCategoryMessage = openCategoryMessages.find(m => m.content === messageToSend);

				// Remove the message from the array so we can check if we need to delete it later
				openCategoryMessages = openCategoryMessages.filter(m => m.content !== messageToSend);


				if (!openCategoryMessage) {
					openCategoryMessage = await openCategoryChannel.send(messageToSend);

					openCategoryMessage.react('✅');
				}

				if (openCategoryTasks[j].remindEveryHours && openCategoryTasks[j].peopleToRemind) {
					if (!openCategoryTasks[j].dateOfLastReminder || new Date() - openCategoryTasks[j].dateOfLastReminder > openCategoryTasks[j].remindEveryHours * 60 * 60 * 1000) {
						openCategoryTasks[j].dateOfLastReminder = new Date();
						openCategoryMessage.reply(`Reminder: <@${openCategoryTasks[j].peopleToRemind.substring(1).split(';').join('>, <@')}>`);
						openCategoryTasks[j].save();
					}
				}
			}

			// Delete any messages that are left in the array
			// eslint-disable-next-line no-unused-vars
			for (const [key, value] of openCategoryMessages) {
				try {
					await value.delete();
				} catch (e) {
					if (e.message !== 'Unknown Message') {
						console.error('Error deleting message in open category', e);
					}
				}
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
				let messageToSend = `**${doneCategoryTasks[j].name}**`;

				if (doneCategoryTasks[j].type === 2) {
					messageToSend = `${messageToSend} - ${doneCategoryTasks[j].amount}`;
				}

				messageToSend = `${messageToSend} - Done <t:${parseInt(doneCategoryTasks[j].dateLastDone.getTime() / 1000)}:R>`;

				if (doneCategoryTasks[j].dateReopen) {
					messageToSend = messageToSend + ` - reopens <t:${parseInt(doneCategoryTasks[j].dateReopen.getTime() / 1000)}:R>`;
				} else {
					messageToSend = messageToSend + ' - Does not reopen automatically';
				}

				messageToSend = messageToSend + ` - Weight: ${doneCategoryTasks[j].weight}`;

				if (doneCategoryTasks[j].type === 2) {
					if (doneCategoryTasks[j].weightType === 1) {
						messageToSend = `${messageToSend} - Absolute`;
					} else {
						messageToSend = `${messageToSend} - Relative`;
					}
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
				try {
					await value.delete();
				} catch (e) {
					if (e.message !== 'Unknown Message') {
						console.error('Error deleting message in done category', e);
					}
				}
			}
		}
	},
	async manageRelevantTasks(client) {
		//Reopen tasks that are done and have a reopen date in the past
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

		let tasksWithReminders = await DBTasks.findAll({
			attributes: ['guildId', 'dateOfLastReminder', 'remindEveryHours'],
			where: {
				remindEveryHours: {
					[Op.not]: null
				},
				peopleToRemind: {
					[Op.not]: null
				},
				guildId: {
					[Op.notIn]: guildsToUpdate
				},
				done: false
			}
		});

		for (let i = 0; i < tasksWithReminders.length; i++) {
			if (!tasksWithReminders[i].dateOfLastReminder || new Date() - tasksWithReminders[i].dateOfLastReminder > tasksWithReminders[i].remindEveryHours * 60 * 60 * 1000) {
				guildsToUpdate.push(tasksWithReminders[i].guildId);
			}
		}

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