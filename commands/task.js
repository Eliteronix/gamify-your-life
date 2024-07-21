const { DBCategories } = require('../dbObjects');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	name: 'task',
	data: new SlashCommandBuilder()
		.setName('task')
		.setNameLocalizations({
			'en-GB': 'task',
			'en-US': 'task',
		})
		.setDescription('Create and delete task categories')
		.setDescriptionLocalizations({
			'en-GB': 'Create and delete task categories',
			'en-US': 'Create and delete task categories',
		})
		.setDMPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setNameLocalizations({
					'en-GB': 'create',
					'en-US': 'create',
				})
				.setDescription('Create a new task')
				.setDescriptionLocalizations({
					'en-GB': 'Create a new task',
					'en-US': 'Create a new task',
				})
				.addStringOption(option =>
					option
						.setName('name')
						.setNameLocalizations({
							'en-GB': 'name',
							'en-US': 'name',
						})
						.setDescription('The name of the task')
						.setDescriptionLocalizations({
							'en-GB': 'The name of the task',
							'en-US': 'The name of the task',
						})
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('category')
						.setNameLocalizations({
							'en-GB': 'category',
							'en-US': 'category',
						})
						.setDescription('The task category')
						.setDescriptionLocalizations({
							'en-GB': 'The task category',
							'en-US': 'The task category',
						})
						.setRequired(true)
						.setAutocomplete(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('update')
				.setNameLocalizations({
					'en-GB': 'update',
					'en-US': 'update',
				})
				.setDescription('Update a task')
				.setDescriptionLocalizations({
					'en-GB': 'Update a task',
					'en-US': 'Update a task',
				})
				.addStringOption(option =>
					option
						.setName('task')
						.setNameLocalizations({
							'en-GB': 'task',
							'en-US': 'task',
						})
						.setDescription('The task to update')
						.setDescriptionLocalizations({
							'en-GB': 'The task to update',
							'en-US': 'The task to update',
						})
						.setRequired(true)
						.setAutocomplete(true)
				)
				.addStringOption(option =>
					option
						.setName('name')
						.setNameLocalizations({
							'en-GB': 'name',
							'en-US': 'name',
						})
						.setDescription('The new name of the task')
						.setDescriptionLocalizations({
							'en-GB': 'The new name of the task',
							'en-US': 'The new name of the task',
						})
				)
				.addStringOption(option =>
					option
						.setName('category')
						.setNameLocalizations({
							'en-GB': 'category',
							'en-US': 'category',
						})
						.setDescription('The new category for the task')
						.setDescriptionLocalizations({
							'en-GB': 'The new category for the task',
							'en-US': 'The new category for the task',
						})
						.setAutocomplete(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setNameLocalizations({
					'en-GB': 'delete',
					'en-US': 'delete',
				})
				.setDescription('Delete a task')
				.setDescriptionLocalizations({
					'en-GB': 'Delete a task',
					'en-US': 'Delete a task',
				})
				.addStringOption(option =>
					option
						.setName('task')
						.setNameLocalizations({
							'en-GB': 'task',
							'en-US': 'task',
						})
						.setDescription('The task to delete')
						.setDescriptionLocalizations({
							'en-GB': 'The task to delete',
							'en-US': 'The task to delete',
						})
						.setAutocomplete(true)
				)
		),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();

		const categories = await DBCategories.findAll({
			attributes: ['name'],
			where: {
				guildId: interaction.guild.id,
			},
			group: ['name'],
		});

		let autocompleteCategories = [];

		categories.forEach(category => {
			autocompleteCategories.push({
				name: category.name,
				creatorId: category.name,
			});
		});

		let filtered = categories.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));

		filtered = filtered.slice(0, 25);

		if (filtered.length === 0) {
			try {
				await interaction.respond([{
					name: 'No categories found | Create a category first',
					value: 'No categories found | Create a category first',
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
		} else if (subcommand === 'update') {
		} else if (subcommand === 'delete') {
		}
	},
};