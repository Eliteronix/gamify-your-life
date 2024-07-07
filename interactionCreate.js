const Discord = require('discord.js');
const fs = require('fs');
const { PermissionsBitField } = require('discord.js');

module.exports = async function (client, bancho, interaction) {
	process.send(`discorduser ${interaction.user.id}}`);

	//Create a collection for the commands
	client.commands = new Discord.Collection();

	//get all command files
	const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

	//Add the commands from the command files to the client.commands collection
	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);

		// set a new item in the Collection
		// with the key as the command name and the value as the exported module
		client.commands.set(command.name, command);
	}

	if (interaction.isCommand()) {
		//Set the command and check for possible uses of aliases
		let command = client.commands.get(interaction.commandName)
			|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(interaction.commandName));

		//Check permissions of the bot
		if (interaction.guildId) {
			let member = interaction.guild.members.cache.get(client.user.id);

			while (!member) {
				try {
					member = await interaction.guild.members.fetch({ user: [client.user.id], time: 300000 })
						.catch((err) => {
							throw new Error(err);
						});

					member = member.first();
				} catch (e) {
					if (e.message !== 'Members didn\'t arrive in time.') {
						console.error('interactionCreate.js | Check bot permissions', e);
						return;
					}
				}
			}

			const botPermissions = interaction.channel.permissionsFor(member);
			if (!botPermissions || !botPermissions.has(PermissionsBitField.Flags.ViewChannel)) {
				//The bot can't possibly answer the message
				return await interaction.reply({ content: 'I can\'t view this channel.', ephemeral: true });
			}

			//Check the command permissions
			if (command.botPermissions) {
				if (!botPermissions.has(command.botPermissions)) {
					return await interaction.reply({ content: `I need the ${command.botPermissionsTranslated} permission to do this!`, ephemeral: true });
				}
			}
		}

		command.execute(null, [], interaction, [client, bancho]);
	} else if (interaction.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`interactionCreate.js | No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error('interactionCreate.js | autocomplete' + error);
		}
	}
};