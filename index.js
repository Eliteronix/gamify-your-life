//Log message upon starting the bot
// eslint-disable-next-line no-console
console.log('Bot is starting...');

require('dotenv').config();

//require the discord.js module
const Discord = require('discord.js');
//create a Discord client with discord.js
const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMembers,
		Discord.GatewayIntentBits.GuildBans,
		Discord.GatewayIntentBits.GuildEmojisAndStickers,
		Discord.GatewayIntentBits.GuildIntegrations,
		Discord.GatewayIntentBits.GuildWebhooks,
		Discord.GatewayIntentBits.GuildInvites,
		Discord.GatewayIntentBits.GuildVoiceStates,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.GuildMessageReactions,
		Discord.GatewayIntentBits.DirectMessages,
		Discord.GatewayIntentBits.DirectMessageReactions,
	],
	partials: [
		Discord.Partials.Message,
		Discord.Partials.Reaction,
		Discord.Partials.Channel,
	]
});

//Get interactionCreate
const interactionCreate = require('./interactionCreate');

//Get reactionAdded
const reactionAdded = require('./reactionAdded');

//Get executeNextProcessQueueTask
const { executeNextProcessQueueTask, manageRelevantTasks } = require('./utils');
const { DBProcessQueue } = require('./dbObjects');

//login with the Discord client using the Token from the .env file
client.login(process.env.BOTTOKEN);

//declare what the discord client should do when it's ready
client.on('ready', readyDiscord);

//declare the function which will be used when ready
function readyDiscord() {
	//log a message when ready
	// eslint-disable-next-line no-console
	console.log('The Bot is ready.');

	client.user.setPresence({
		status: 'online',  //You can show online, idle....
		activities: [{
			name: 'with your motivation',  //The message shown
			//type: 'PLAYING' //PLAYING: WATCHING: LISTENING: STREAMING:
		}]
	});

	const { REST, Routes } = require('discord.js');
	const fs = require('node:fs');

	const commands = [];
	// Grab all the command files from the commands directory you created earlier
	const commandFiles = fs.readdirSync('./commands');

	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		if (!file.endsWith('.js')) {
			continue;
		}

		const command = require(`./commands/${file}`);

		commands.push(command.data.toJSON());
	}

	const rest = new REST({ version: '10' }).setToken(process.env.BOTTOKEN);

	(async () => {
		let notDone = true;
		while (notDone) {
			try {
				// eslint-disable-next-line no-console
				console.log(`Started refreshing ${commands.length} application (/) commands.`);

				const data = await rest.put(
					Routes.applicationCommands(client.user.id),
					{ body: commands },
				);

				// eslint-disable-next-line no-console
				console.log(`Successfully reloaded ${data.length} application (/) commands.`);

				client.slashCommandData = data;
				notDone = false;
			} catch (error) {
				console.error('index.js | Set application commands' + error);
			}
		}
	})();

	setTimeout(() => {
		//Reste all processqueue tasks which may be started
		DBProcessQueue.update({
			beingExecuted: false
		}, {
			where: {
				beingExecuted: true
			}
		});

		executeProcessQueue(client);
		manageTasks(client);
	}, 60000);
}

client.on('interactionCreate', interaction => {
	interactionCreate(interaction);
});

client.on('messageReactionAdd', reactionAdded);

client.on('error', console.error);

async function executeProcessQueue(client) {
	try {
		await executeNextProcessQueueTask(client);
	} catch (e) {
		console.error('index.js | executeNextProcessQueueTask ' + e);
	}

	setTimeout(() => {
		executeProcessQueue(client);
	}, 650);
}

async function manageTasks(client) {
	try {
		await manageRelevantTasks(client);
	} catch (e) {
		console.error('index.js | manageRelevantTasks ' + e);
	}

	setTimeout(() => {
		manageTasks(client);
	}, 60000);
}