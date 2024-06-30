module.exports = (sequelize, DataTypes) => {
	return sequelize.define('DBProcessQueue', {
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
		done: DataTypes.BOOLEAN,
		date: {
			type: DataTypes.DATE,
		},
		resetEveryHours: DataTypes.INTEGER,
	}, {
		indexes: [
			{
				unique: false,
				fields: ['beingExecuted', 'date', 'priority']
			}
		]
	});
};
