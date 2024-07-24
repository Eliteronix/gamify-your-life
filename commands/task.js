const { DBCategories, DBTasks } = require('../dbObjects');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	name: 'task',
	data: new SlashCommandBuilder()
		.setName('task')
		.setDescription('Create and delete task categories')
		.setDMPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Create a new task')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The name of the task')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('category')
						.setDescription('The task category')
						.setAutocomplete(true)
				)
				.addIntegerOption(option =>
					option
						.setName('type')
						.setDescription('The type of the task')
						.addChoices(
							{ name: 'Checkbox', value: 1 },
							{ name: 'Amount', value: 2 },
						)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('update')
				.setDescription('Update a task')
				.addStringOption(option =>
					option
						.setName('task')
						.setDescription('The task to update')
						.setRequired(true)
						.setAutocomplete(true)
				)
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The new name of the task')
				)
				.addStringOption(option =>
					option
						.setName('category')
						.setDescription('The new category for the task')
						.setAutocomplete(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('Delete a task')
				.addStringOption(option =>
					option
						.setName('task')
						.setDescription('The task to delete')
						.setAutocomplete(true)
				)
		),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);

		let filtered = [];
		let filterTerm = null;

		if (focusedValue.name === 'category') {
			const categories = await DBCategories.findAll({
				attributes: ['name'],
				where: {
					guildId: interaction.guild.id,
				},
				group: ['name'],
			});

			filtered = categories.filter(choice => choice.name.toLowerCase().includes(focusedValue.value.toLowerCase()));

			filterTerm = 'No categories found | Create a category first';
		} else if (focusedValue.name === 'task') {
			const tasks = await DBTasks.findAll({
				attributes: ['name'],
				where: {
					guildId: interaction.guild.id,
				},
				group: ['name'],
			});

			filtered = tasks.filter(choice => choice.name.toLowerCase().includes(focusedValue.value.toLowerCase()));

			filterTerm = 'No tasks found | Create a task first';
		}

		filtered = filtered.slice(0, 25);

		if (filtered.length === 0) {
			try {
				await interaction.respond([{
					name: filterTerm,
					value: filterTerm,
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

		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'create') {
			const taskName = interaction.options.getString('name').toLowerCase();

			const task = await DBTasks.findOne({
				where: {
					guildId: interaction.guild.id,
					name: taskName,
				},
			});

			if (task) {
				try {
					await interaction.editReply('Task already exists');
				} catch (error) {
					if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
						console.error(error);
					}
				}
				return;
			}

			const categoryName = interaction.options.getString('category');

			if (categoryName) {
				const category = await DBCategories.findOne({
					where: {
						guildId: interaction.guild.id,
						name: categoryName,
					},
				});

				if (!category) {
					try {
						await interaction.editReply('Category does not exist');
					} catch (error) {
						if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
							console.error(error);
						}
					}
					return;
				}
			}

			await DBTasks.create({
				guildId: interaction.guild.id,
				name: taskName,
				category: categoryName,
				type: interaction.options.getInteger('type'),
			});
		} else if (subcommand === 'update') {
		} else if (subcommand === 'delete') {
			const taskName = interaction.options.getString('task').toLowerCase();

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

			await task.destroy();
		}
	},
};