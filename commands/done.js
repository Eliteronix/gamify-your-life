const { DBTasks } = require('../dbObjects');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { updateGuildDisplay } = require('../utils');

module.exports = {
	name: 'done',
	data: new SlashCommandBuilder()
		.setName('done')
		.setDescription('Mark a task as done')
		.setDMPermission(false)
		.setDescription('Create a new checkbox task')
		.addStringOption(option =>
			option
				.setName('name')
				.setDescription('The name of the task')
				.setRequired(true)
		),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);

		const tasks = await DBTasks.findAll({
			attributes: ['name'],
			where: {
				guildId: interaction.guild.id,
			},
			group: ['name'],
		});

		let filtered = tasks.filter(choice => choice.name.toLowerCase().includes(focusedValue.value.toLowerCase()));

		filtered = filtered.slice(0, 25);

		if (filtered.length === 0) {
			try {
				await interaction.respond([{
					name: 'No tasks found | Create a task first',
					value: 'No tasks found | Create a task first',
				}]);
			} catch (error) {
				if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
					console.error(error);
				}
			}
			return;
		}

		try {
			await interaction.respond(
				filtered.map(choice => ({ name: choice.name, value: choice.name })),
			);
		} catch (error) {
			if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
				console.error(error);
			}
		}
	},
	async execute(interaction) {
		try {
			await interaction.deferReply({ ephemeral: true });
		} catch (error) {
			if (error.message !== 'Unknown interaction') {
				console.error(error);
			}
			return;
		}



		updateGuildDisplay(interaction.guild);
	},
};