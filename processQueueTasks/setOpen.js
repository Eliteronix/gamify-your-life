const { DBTasks } = require('../dbObjects');
const { updateGuildDisplay } = require('../utils');

module.exports = {
	async execute(client, processQueueEntry) {
		let task = await DBTasks.findOne({
			attributes: ['id', 'guildId', 'streakEndDate', 'dateLastDone'],
			where: {
				id: processQueueEntry.additions,
			},
		});

		if (!task) {
			await processQueueEntry.destroy();
			return;
		}

		task.done = false;

		let streakEndDate = new Date();
		let dateDiff = streakEndDate - task.dateLastDone;
		streakEndDate.setTime(streakEndDate.getTime() + dateDiff);

		streakEndDate.setDate(streakEndDate.getDate() + 1);

		task.streakEndDate = streakEndDate;

		await task.save();

		let guild = await client.guilds.fetch(processQueueEntry.guildId);

		updateGuildDisplay(guild);

		await processQueueEntry.destroy();
	},
};