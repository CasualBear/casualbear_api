module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define("Team", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    name: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    zones: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: JSON.stringify([]),
    },
  });

  Team.associate = (models) => {
    Team.belongsTo(models.Event, {
      foreignKey: "eventId",
      as: "event",
    });

    Team.hasMany(models.User, {
      as: "members",
      foreignKey: "teamId",
    });
  };

  return Team;
};
