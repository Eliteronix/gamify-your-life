const { DBCategories } = require('../dbObjects');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

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
				.setName('rename')
				.setNameLocalizations({
					'en-GB': 'rename',
					'en-US': 'rename',
				})
				.setDescription('Rename a task category')
				.setDescriptionLocalizations({
					'en-GB': 'Rename a task category',
					'en-US': 'Rename a task category',
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
				.addStringOption(option =>
					option
						.setName('new-name')
						.setNameLocalizations({
							'en-GB': 'new-name',
							'en-US': 'new-name',
						})
						.setDescription('The new name of the task category')
						.setDescriptionLocalizations({
							'en-GB': 'The new name of the task category',
							'en-US': 'The new name of the task category',
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
			const categoryName = interaction.options.getString('name').toLowerCase();

			const category = await DBCategories.findOne({
				where: {
					guildId: interaction.guild.id,
					name: categoryName,
				},
			});

			if (category) {
				try {
					await interaction.editReply(`Category \`${categoryName}\` already exists`);
				} catch (error) {
					if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
						console.error(error);
					}
				}
				return;
			}

			await DBCategories.create({
				guildId: interaction.guild.id,
				name: categoryName,
			});

			await interaction.guild.channels.create({
				name: categoryName,
				type: Discord.Constants.TextBasedChannelTypes.GuildText,
			});

			try {
				await interaction.editReply(`Category \`${categoryName}\` created`);
			} catch (error) {
				if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
					console.error(error);
				}
			}
		} else if (subcommand === 'rename') {
			const categoryName = interaction.options.getString('name').toLowerCase();

			const category = await DBCategories.findOne({
				where: {
					guildId: interaction.guild.id,
					name: categoryName,
				},
			});

			if (!category) {
				try {
					await interaction.editReply(`Category \`${categoryName}\` does not exist`);
				} catch (error) {
					if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
						console.error(error);
					}
				}
				return;
			}

			const newName = interaction.options.getString('new-name').toLowerCase();

			await DBCategories.update({
				name: newName,
			}, {
				where: {
					guildId: interaction.guild.id,
					name: categoryName,
				},
			});

			const channel = interaction.guild.channels.cache.find(channel => channel.name === categoryName);

			if (channel) {
				await channel.setName(newName);
			}

			try {
				await interaction.editReply(`Category \`${categoryName}\` renamed to \`${newName}\``);
			} catch (error) {
				if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
					console.error(error);
				}
			}
		} else if (subcommand === 'delete') {
			const categoryName = interaction.options.getString('name').toLowerCase();

			const category = await DBCategories.findOne({
				where: {
					guildId: interaction.guild.id,
					name: categoryName,
				},
			});

			if (!category) {
				try {
					await interaction.editReply(`Category \`${categoryName}\` does not exist`);
				} catch (error) {
					if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
						console.error(error);
					}
				}
				return;
			}

			await DBCategories.destroy({
				where: {
					guildId: interaction.guild.id,
					name: categoryName,
				},
			});

			const channel = interaction.guild.channels.cache.find(channel => channel.name === categoryName);

			if (channel) {
				await channel.delete();
			}

			try {
				await interaction.editReply(`Category \`${categoryName}\` deleted`);
			} catch (error) {
				if (error.message !== 'Unknown interaction' && error.message !== 'The reply to this interaction has already been sent or deferred.') {
					console.error(error);
				}
			}
		}
	},
};