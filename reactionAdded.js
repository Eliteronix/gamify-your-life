const { DBTasks } = require('./dbObjects');
const { markTaskAsDone, updateGuildDisplay } = require('./utils');

module.exports = async function (reaction, user) {
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('reactionAdded.js | Fetching message failed: ', error);
			return;
		}
	}

	if (reaction.message.partial) {
		try {
			await reaction.message.fetch();
		} catch (error) {
			console.error('reactionAdded.js | Fetching message failed: ', error);
			return;
		}
	}

	if (user.bot) return;

	if (reaction.message.author.id !== reaction.message.client.user.id) return;

	if (reaction.emoji.name === '✅') {
		let taskName = reaction.message.content.replace('**', '').replace(/\*\*.+/gm, '');

		let task = await DBTasks.findOne({
			where: {
				name: taskName,
			},
		});

		if (!task) {
			console.error('reactionAdded.js | Task not found');
			return;
		}

		await markTaskAsDone(task, reaction.message.guild.id);

		updateGuildDisplay(reaction.message.guild);
	}

	if (reaction.emoji.name === '🔄') {
		let taskName = reaction.message.content.replace('**', '').replace(/\*\*.+/gm, '');

		let task = await DBTasks.findOne({
			where: {
				name: taskName,
			},
		});

		if (!task) {
			console.error('reactionAdded.js | Task not found');
			return;
		}

		task.done = false;

		await task.save();

		updateGuildDisplay(reaction.message.guild);
	}
};