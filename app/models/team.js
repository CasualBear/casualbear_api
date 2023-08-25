module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define("Team", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    totalPoints: DataTypes.INTEGER,
    name: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    isCheckedOverall: DataTypes.BOOLEAN,
    isVerified: DataTypes.STRING,
    isCheckedIn: DataTypes.BOOLEAN,
    timeSpent: {
      allowNull: true, // You can set this to false if timeSpent is always required
      type: DataTypes.BIGINT, // Using INTEGER for milliseconds
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
