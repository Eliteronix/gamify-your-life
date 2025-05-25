const { DBCategories, DBTasks, DBTaskCategories, DBGuildSettings } = require('../dbObjects');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { updateGuildDisplay } = require('../utils');

module.exports = {
	name: 'task',
	data: new SlashCommandBuilder()
		.setName('task')
		.setDescription('Create, update and delete tasks')
		.setDMPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create-checkbox')
				.setDescription('Create a new checkbox task')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The name of the task')
						.setRequired(true)
				)
				.addIntegerOption(option =>
					option
						.setName('reset-every-days')
						.setDescription('The amount of days until the task resets')
				)
				.addIntegerOption(option =>
					option
						.setName('reset-every-hours')
						.setDescription('The amount of hours until the task resets')
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create-amount')
				.setDescription('Create a new amount task')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('The name of the task')
						.setRequired(true)
				)
				.addIntegerOption(option =>
					option
						.setName('amount')
						.setDescription('The max amount for the task')
				)
				.addIntegerOption(option =>
					option
						.setName('reduction-per-hour')
						.setDescription('The amount to reduce by every hour')
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
				.addIntegerOption(option =>
					option
						.setName('reset-every-days')
						.setDescription('The amount of days until the task resets')
				)
				.addIntegerOption(option =>
					option
						.setName('reset-every-hours')
						.setDescription('The amount of hours until the task resets')
				)
				.addIntegerOption(option =>
					option
						.setName('amount')
						.setDescription('The max amount for the task')
				)
				.addIntegerOption(option =>
					option
						.setName('reduction-per-hour')
						.setDescription('The amount to reduce by every hour')
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
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('assign-category')
				.setDescription('Assign a task to a (new) category')
				.addStringOption(option =>
					option
						.setName('task')
						.setDescription('The task to assign to a category')
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('category')
						.setDescription('The category to assign the task to')
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addIntegerOption(option =>
					option
						.setName('weight')
						.setDescription('The weight of the task in the category')
						.setRequired(true)
				)
				.addIntegerOption(option =>
					option
						.setName('type')
						.setDescription('The type of weight to use (Only applies to amount tasks)')
						.setRequired(true)
						.addChoices(
							{ name: 'Absolute', value: 1 },
							{ name: 'Relative', value: 2 },
						))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove-category')
				.setDescription('Remove a task from a category')
				.addStringOption(option =>
					option
						.setName('task')
						.setDescription('The task to remove from a category')
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('category')
						.setDescription('The category to remove the task from')
						.setAutocomplete(true)
						.setRequired(true)
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

		if (subcommand === 'create-checkbox') {
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

			await DBTasks.create({
				guildId: interaction.guild.id,
				name: taskName,
				type: 1,
				dateReopen: new Date(),
				resetEveryDays: interaction.options.getInteger('reset-every-days'),
				resetEveryHours: interaction.options.getInteger('reset-every-hours'),
			});

			await interaction.followUp(`Task \`${taskName}\` has been created`);
		} else if (subcommand === 'create-amount') {
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

			await DBTasks.create({
				guildId: interaction.guild.id,
				name: taskName,
				type: 2,
				amount: interaction.options.getInteger('amount'),
				reductionPerHour: interaction.options.getInteger('reduction-per-hour'),
			});

			await interaction.followUp(`Task \`${taskName}\` has been created`);
		} else if (subcommand === 'update') {
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

			const name = interaction.options.getString('name');

			if (name) {
				task.name = name;
			}

			const resetEveryDays = interaction.options.getInteger('reset-every-days');

			if (resetEveryDays) {
				if (task.type === 1) {
					task.resetEveryDays = resetEveryDays;
					task.resetEveryHours = null;

					if (task.done) {
						task.dateReopen = task.dateLastDone;

						let guildSettings = await DBGuildSettings.findOne({
							attributes: ['dailyResetTime'],
							where: {
								guildId: interaction.guild.id,
							},
						});

						if (!guildSettings) {
							guildSettings = await DBGuildSettings.create({
								guildId: interaction.guild.id,
								dailyResetTime: 5,
							});
						}

						task.dateReopen.setMinutes(0);
						task.dateReopen.setSeconds(0);
						task.dateReopen.setMilliseconds(0);

						let hoursDifferenceToReset = task.dateReopen.getUTCHours() - guildSettings.dailyResetTime;

						task.dateReopen.setUTCHours(guildSettings.dailyResetTime);

						// If the reset time was in the future, set it to the previous day | calculated by the difference between the current time and the reset time
						if (hoursDifferenceToReset < 0) {
							task.dateReopen.setDate(task.dateReopen.getDate() - 1);
						}

						task.dateReopen.setDate(task.dateReopen.getDate() + task.resetEveryDays);
					}
				} else {
					try {
						await interaction.followUp('Task is not a checkbox task and cannot be updated with reset-every-days');
					} catch (error) {
						if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
							console.error(error);
						}
					}
				}
			}

			const resetEveryHours = interaction.options.getInteger('reset-every-hours');

			if (resetEveryHours) {
				if (task.type === 1) {
					task.resetEveryHours = resetEveryHours;
					task.resetEveryDays = null;

					if (task.done) {
						task.dateReopen = task.dateLastDone;
						task.dateReopen.setHours(task.dateReopen.getHours() + task.resetEveryHours);
					}
				} else {
					try {
						await interaction.followUp('Task is not a checkbox task and cannot be updated with reset-every-hours');
					} catch (error) {
						if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
							console.error(error);
						}
					}
				}
			}

			const amount = interaction.options.getInteger('amount');

			if (amount) {
				if (task.type === 2) {
					task.amount = amount;
				} else {
					try {
						await interaction.followUp('Task is not an amount task and cannot be updated with amount');
					} catch (error) {
						if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
							console.error(error);
						}
					}
				}
			}

			const reductionPerHour = interaction.options.getInteger('reduction-per-hour');

			if (reductionPerHour) {
				if (task.type === 2) {
					task.reductionPerHour = reductionPerHour;
				} else {
					try {
						await interaction.followUp('Task is not an amount task and cannot be updated with reduction-per-hour');
					} catch (error) {
						if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
							console.error(error);
						}
					}
				}
			}

			await task.save();

			try {
				await interaction.followUp('Task updated');
			} catch (error) {
				if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
					console.error(error);
				}
			}
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

			await interaction.editReply(`Task \`${taskName}\` has been deleted`);
		} else if (subcommand === 'assign-category') {
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

			const categoryName = interaction.options.getString('category');

			const category = await DBCategories.findOne({
				where: {
					guildId: interaction.guild.id,
					name: categoryName,
				},
			});

			if (!category) {
				try {
					await interaction.followUp('Category does not exist and has not been updated');
				} catch (error) {
					if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
						console.error(error);
					}
				}
				return;
			}

			await DBTaskCategories.destroy({
				where: {
					guildId: interaction.guild.id,
					categoryId: category.id,
					taskId: task.id,
				},
			});

			await DBTaskCategories.create({
				guildId: interaction.guild.id,
				categoryId: category.id,
				taskId: task.id,
				weight: interaction.options.getInteger('weight'),
				type: interaction.options.getInteger('type'),
			});

			await interaction.followUp(`Task \`${taskName}\` has been assigned to the category \`${categoryName}\` with a weight of ${interaction.options.getInteger('weight')}`);
		} else if (subcommand === 'remove-category') {
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

			const categoryName = interaction.options.getString('category');

			const category = await DBCategories.findOne({
				where: {
					guildId: interaction.guild.id,
					name: categoryName,
				},
			});

			if (!category) {
				try {
					await interaction.followUp('Category does not exist and has not been updated');
				} catch (error) {
					if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
						console.error(error);
					}
				}
				return;
			}

			await DBTaskCategories.destroy({
				where: {
					guildId: interaction.guild.id,
					categoryId: category.id,
					taskId: task.id,
				},
			});

			await interaction.followUp(`Task \`${taskName}\` has been removed from the category \`${categoryName}\``);
		}

		updateGuildDisplay(interaction.guild);
	},
};