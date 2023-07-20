module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define("Event", {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    selectedColor: DataTypes.BIGINT,
    rawUrl: DataTypes.STRING,
    zones: DataTypes.STRING, // Add the 'zones' field
  });

  Event.associate = function (models) {
    Event.hasMany(models.TeamMember, {
      foreignKey: "event_id",
      onDelete: "CASCADE",
    });
    Event.hasMany(models.Question, {
      foreignKey: "eventId",
      as: "questions",
    });
    Event.hasMany(models.TeamMember, {
      foreignKey: "event_id",
      onDelete: "CASCADE",
      as: "teams",
    });
  };

  return Event;
};
