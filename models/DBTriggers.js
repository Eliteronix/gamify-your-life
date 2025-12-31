module.exports = (sequelize, DataTypes) => {
	return sequelize.define('DBTriggers', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		guildId: {
			type: DataTypes.STRING,
			allowNullValue: false,
		},
		triggerCategoryId: DataTypes.INTEGER,
		triggerTaskId: DataTypes.INTEGER,
		triggerDays: DataTypes.INTEGER,
		triggerHours: DataTypes.INTEGER,
		triggerType: DataTypes.INTEGER,
		actionTaskId: DataTypes.INTEGER,
	}, {
		indexes: [
			{
				unique: false,
				fields: ['guildId', 'triggerCategoryId', 'triggerTaskId']
			}
		]
	});
};
