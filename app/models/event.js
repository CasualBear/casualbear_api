module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define("Event", {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    selectedColor: DataTypes.BIGINT,
    eventInitHour: DataTypes.BIGINT,
    hasStarted: DataTypes.BOOLEAN,
    rawUrl: DataTypes.STRING,
  });

  Event.associate = function (models) {
    Event.hasMany(models.Question, {
      foreignKey: "eventId",
      as: "questions",
    });
  };

  return Event;
};
