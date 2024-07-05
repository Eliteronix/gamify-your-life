module.exports = (sequelize, DataTypes) => {
	return sequelize.define('DBGuildSettings', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		guildId: {
			type: DataTypes.STRING,
			allowNullValue: false,
		},
		dailyResetTime: DataTypes.INTEGER,
	}, {
		indexes: [
			{
				unique: false,
				fields: ['guildId']
			}
		]
	});
};
