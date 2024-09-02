const { DBTasks } = require('../dbObjects');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { updateGuildDisplay, markTaskAsDone } = require('../utils');

module.exports = {
	name: 'remind',
	data: new SlashCommandBuilder()
		.setName('remind')
		.setDescription('Manage reminders')
		.setDMPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('interval')
				.setDescription('Update the interval of a tasks reminder')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The name of the task')
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addIntegerOption(option =>
					option
						.setName('interval')
						.setDescription('The interval in hours')
						.setRequired(true)
						.setMinValue(1)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('add-user')
				.setDescription('Add a user to a tasks reminder')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The name of the task')
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addUserOption(option =>
					option
						.setName('user')
						.setDescription('The user to add')
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove-user')
				.setDescription('Remove a user from a tasks reminder')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The name of the task')
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addUserOption(option =>
					option
						.setName('user')
						.setDescription('The user to remove')
						.setRequired(true)
				)
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

		const taskName = interaction.options.getString('name').toLowerCase();

		const task = await DBTasks.findOne({
			where: {
				guildId: interaction.guild.id,
				name: taskName,
			},
		});

		if (!task) {
			try {
				await interaction.editReply('Task does not exist');
			} catch (error) {
				if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
					console.error(error);
				}
			}
			return;
		}

		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'interval') {
			const interval = interaction.options.getInteger('interval');

			task.remindEveryHours = interval;
			await task.save();

			await interaction.editReply(`Interval of task \`${taskName}\` updated to ${interval} hours`);

			updateGuildDisplay(interaction.guild);
		} else if (subcommand === 'add-user') {
			const user = interaction.options.getUser('user');

			if (task.peopleToRemind === null) {
				task.peopleToRemind = '';
			} else if (task.peopleToRemind.includes(user.id)) {
				return await interaction.editReply(`User ${user.username} is already in the reminder list for task \`${taskName}\``);
			}

			task.peopleToRemind = task.peopleToRemind + ';' + user.id;
			await task.save();

			await interaction.editReply(`User ${user.username} added to the reminder list for task \`${taskName}\``);

			updateGuildDisplay(interaction.guild);
		} else if (subcommand === 'remove-user') {
			const user = interaction.options.getUser('user');

			if (task.peopleToRemind === null) {
				task.peopleToRemind = '';
			}

			if (!task.peopleToRemind.includes(user.id)) {
				return await interaction.editReply(`User ${user.username} is not in the reminder list for task \`${taskName}\``);
			}

			task.peopleToRemind = task.peopleToRemind.replace(`;${user.id}`, '');
			await task.save();

			await interaction.editReply(`User ${user.username} removed from the reminder list for task \`${taskName}\``);
		}
	},
};