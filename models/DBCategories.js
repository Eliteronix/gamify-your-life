module.exports = (sequelize, DataTypes) => {
	return sequelize.define('DBTasks', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		guildId: {
			type: DataTypes.STRING,
			allowNullValue: false,
		},
		name: DataTypes.STRING,
	}, {
		indexes: [
			{
				unique: false,
				fields: ['guildId']
			}
		]
	});
};
