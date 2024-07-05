module.exports = (sequelize, DataTypes) => {
	return sequelize.define('DBTaskCategories', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		guildId: {
			type: DataTypes.STRING,
			allowNullValue: false,
		},
		categoryId: DataTypes.INTEGER,
		taskId: DataTypes.INTEGER,
		weight: DataTypes.INTEGER,
		type: DataTypes.INTEGER,
	}, {
		indexes: [
			{
				unique: false,
				fields: ['guildId', 'categoryId', 'taskId']
			}
		]
	});
};
