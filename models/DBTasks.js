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
		type: DataTypes.INTEGER,
		amount: DataTypes.INTEGER,
		reductionPerHour: DataTypes.INTEGER,
		done: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		dateLastDone: {
			type: DataTypes.DATE,
		},
		dateReopen: {
			type: DataTypes.DATE,
		},
		resetEveryHours: DataTypes.INTEGER,
		resetEveryDays: DataTypes.INTEGER,
	}, {
		indexes: [
			{
				unique: false,
				fields: ['guildId']
			}
		]
	});
};
