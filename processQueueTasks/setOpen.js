const { DBTasks } = require('../dbObjects');
const { updateGuildDisplay } = require('../utils');

module.exports = {
	async execute(client, processQueueEntry) {
		let task = await DBTasks.findOne({
			where: {
				id: processQueueEntry.additions,
			},
		});

		if (!task) {
			await processQueueEntry.destroy();
			return;
		}

		task.done = false;

		await task.save();

		let guild = await client.guilds.fetch(processQueueEntry.guildId);

		updateGuildDisplay(guild);

		await processQueueEntry.destroy();
	},
};