const { DBCategories } = require('../dbObjects');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	name: 'category',
	data: new SlashCommandBuilder()
		.setName('category')
		.setNameLocalizations({
			'en-GB': 'category',
			'en-US': 'category',
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
				.setDescription('Create a new task category')
				.setDescriptionLocalizations({
					'en-GB': 'Create a new task category',
					'en-US': 'Create a new task category',
				})
				.addStringOption(option =>
					option
						.setName('name')
						.setNameLocalizations({
							'en-GB': 'name',
							'en-US': 'name',
						})
						.setDescription('The name of the task category')
						.setDescriptionLocalizations({
							'en-GB': 'The name of the task category',
							'en-US': 'The name of the task category',
						})
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setNameLocalizations({
					'en-GB': 'delete',
					'en-US': 'delete',
				})
				.setDescription('Delete a task category')
				.setDescriptionLocalizations({
					'en-GB': 'Delete a task category',
					'en-US': 'Delete a task category',
				})
				.addStringOption(option =>
					option
						.setName('name')
						.setNameLocalizations({
							'en-GB': 'name',
							'en-US': 'name',
						})
						.setDescription('The name of the task category')
						.setDescriptionLocalizations({
							'en-GB': 'The name of the task category',
							'en-US': 'The name of the task category',
						})
						.setRequired(true)
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

			gotResponse = true;
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
	},
};