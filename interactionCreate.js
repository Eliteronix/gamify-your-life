const Discord = require('discord.js');
const fs = require('fs');

module.exports = async function (interaction) {
	//Create a collection for the commands
	interaction.client.commands = new Discord.Collection();

	//get all command files
	const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

	//Add the commands from the command files to the client.commands collection
	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);

		// set a new item in the Collection
		// with the key as the command name and the value as the exported module
		interaction.client.commands.set(command.name, command);
	}

	if (interaction.isCommand()) {
		let command = interaction.client.commands.get(interaction.commandName);

		command.execute(interaction);
	} else if (interaction.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`interactionCreate.js | No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error('interactionCreate.js | autocomplete ' + error);
		}
	}
};