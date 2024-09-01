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

	if (reaction.emoji.name === '✅') {

	}

	if (reaction.emoji.name === '🔄') {

	}
};