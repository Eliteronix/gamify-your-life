module.exports = (sequelize, DataTypes) => {
	return sequelize.define('DBCategories', {
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
