require('dotenv').config();

module.exports = {
	name: "Gamify", // Name of your application
	script: "index.js", // Entry point of your application
	watch: returnBoolean(process.env.SERVER), // Watch for file changes
	ignore_watch: [
		"databases",
	],
};

function returnBoolean(value) {
	if (value === "Live") return false;
	if (value === "Dev") return true;
	return value;
}