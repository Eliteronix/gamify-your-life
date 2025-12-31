const { DBTasks, DBCategories, DBTriggers } = require('../dbObjects');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { Op } = require('sequelize');

module.exports = {
	name: 'trigger',
	data: new SlashCommandBuilder()
		.setName('trigger')
		.setDescription('Set up a trigger for a task')
		.setDMPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Create a new trigger for a task')
				.addStringOption(option =>
					option
						.setName('actiontask')
						.setDescription('The task to perform an action on')
						.setRequired(true)
						.setAutocomplete(true),
				)
				.addIntegerOption(option =>
					option
						.setName('action')
						.setDescription('The action to perform')
						.setRequired(true)
						.addChoices(
							{ name: 'Mark as Done', value: 1 },
							{ name: 'Open', value: 0 },
						),
				)
				.addStringOption(option =>
					option
						.setName('triggercategory')
						.setDescription('The category to trigger an action')
						.setRequired(false)
						.setAutocomplete(true),
				)
				.addStringOption(option =>
					option
						.setName('triggertask')
						.setDescription('The task to trigger an action')
						.setRequired(false)
						.setAutocomplete(true),
				)
				.addIntegerOption(option =>
					option
						.setName('triggerdays')
						.setDescription('Number of days before trigger activates')
						.setRequired(false)
						.setMinValue(0),
				)
				.addIntegerOption(option =>
					option
						.setName('triggerhours')
						.setDescription('Number of hours before trigger activates')
						.setRequired(false)
						.setMinValue(0),
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('Delete an existing trigger')
				.addIntegerOption(option =>
					option
						.setName('trigger')
						.setDescription('The trigger to delete')
						.setRequired(true)
						.setAutocomplete(true),
				)
		),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);

		let filtered = [];
		let filterTerm = null;

		if (focusedValue.name === 'triggercategory') {
			const categories = await DBCategories.findAll({
				attributes: ['name'],
				where: {
					guildId: interaction.guild.id,
				},
				group: ['name'],
			});

			filtered = categories.filter(choice => choice.name.toLowerCase().includes(focusedValue.value.toLowerCase()));

			filterTerm = 'No categories found | Create a category first';
		} else if (focusedValue.name === 'actiontask' || focusedValue.name === 'triggertask') {
			const tasks = await DBTasks.findAll({
				attributes: ['name'],
				where: {
					guildId: interaction.guild.id,
				},
				group: ['name'],
			});

			filtered = tasks.filter(choice => choice.name.toLowerCase().includes(focusedValue.value.toLowerCase()));

			filterTerm = 'No tasks found | Create a task first';
		} else if (focusedValue.name === 'trigger') {
			const triggers = await DBTriggers.findAll({
				attributes: ['id', 'actionTaskId', 'triggerType', 'triggerCategoryId', 'triggerTaskId'],
				where: {
					guildId: interaction.guild.id,
				},
			});

			const actionTasks = await DBTasks.findAll({
				attributes: ['id', 'name'],
				where: {
					guildId: interaction.guild.id,
					id: {
						[Op.in]: triggers.map(t => t.actionTaskId),
					},
				},
			});

			const triggerCategories = await DBCategories.findAll({
				attributes: ['id', 'name'],
				where: {
					guildId: interaction.guild.id,
					id: {
						[Op.in]: triggers.map(t => t.triggerCategoryId).filter(id => id !== null),
					},
				},
			});

			const triggerTasks = await DBTasks.findAll({
				attributes: ['id', 'name'],
				where: {
					guildId: interaction.guild.id,
					id: {
						[Op.in]: triggers.map(t => t.triggerTaskId).filter(id => id !== null),
					},
				},
			});

			filtered = triggers.map(trigger => {
				let triggerDesc = `Trigger ID ${trigger.id}: When `;
				if (trigger.triggerCategoryId) {
					const category = triggerCategories.find(c => c.id === trigger.triggerCategoryId);
					triggerDesc += `category "${category ? category.name : 'Unknown'}" `;
				} else if (trigger.triggerTaskId) {
					const task = triggerTasks.find(t => t.id === trigger.triggerTaskId);
					triggerDesc += `task "${task ? task.name : 'Unknown'}" `;
				}
				triggerDesc += `then ${trigger.triggerType === 1 ? 'mark as done' : 'open'} task "${actionTasks.find(t => t.id === trigger.actionTaskId) ? actionTasks.find(t => t.id === trigger.actionTaskId).name : 'Unknown'}"`;
				return {
					name: triggerDesc,
					value: trigger.id,
				};
			}).filter(choice => choice.name.toLowerCase().includes(focusedValue.value.toLowerCase()));

			filterTerm = 'No triggers found';
		}

		filtered = filtered.slice(0, 25);

		if (filtered.length === 0) {
			try {
				await interaction.respond([{
					name: filterTerm,
					value: -1,
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
				filtered.map(choice => ({
					name: choice.name,
					value: choice.value ? choice.value : choice.name,
				})),
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
			const taskName = interaction.options.getString('actiontask').toLowerCase();

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

			const action = interaction.options.getInteger('action');

			const triggerCategoryName = interaction.options.getString('triggercategory');
			const triggerTaskName = interaction.options.getString('triggertask');

			if (!triggerCategoryName && !triggerTaskName) {
				return await interaction.editReply('You must specify either a trigger category or trigger task');
			} else if (triggerCategoryName && triggerTaskName) {
				return await interaction.editReply('You can only specify either a trigger category or trigger task, not both');
			}

			let triggerCategory = null;
			let triggerTask = null;

			if (triggerCategoryName) {
				triggerCategory = await DBCategories.findOne({
					where: {
						guildId: interaction.guild.id,
						name: triggerCategoryName.toLowerCase(),
					},
				});

				if (!triggerCategory) {
					return await interaction.editReply('Trigger category does not exist');
				}
			}

			if (triggerTaskName) {
				triggerTask = await DBTasks.findOne({
					where: {
						guildId: interaction.guild.id,
						name: triggerTaskName.toLowerCase(),
					},
				});

				if (!triggerTask) {
					return await interaction.editReply('Trigger task does not exist');
				}
			}

			const triggerDays = interaction.options.getInteger('triggerdays');
			const triggerHours = interaction.options.getInteger('triggerhours');

			let trigger = await DBTriggers.create({
				guildId: interaction.guild.id,
				triggerCategoryId: triggerCategory ? triggerCategory.id : null,
				triggerTaskId: triggerTask ? triggerTask.id : null,
				triggerDays: triggerDays ? triggerDays : 0,
				triggerHours: triggerHours ? triggerHours : 0,
				triggerType: action,
				actionTaskId: task.id,
			});

			return await interaction.editReply('Trigger created successfully');
		} else if (subcommand === 'delete') {
			const triggerId = interaction.options.getInteger('trigger');

			const trigger = await DBTriggers.findOne({
				where: {
					guildId: interaction.guild.id,
					id: triggerId,
				},
			});

			if (!trigger) {
				return await interaction.editReply('Trigger does not exist');
			}

			await trigger.destroy();

			return await interaction.editReply('Trigger deleted successfully');

		}
	},
};