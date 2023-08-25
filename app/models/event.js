module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define("Event", {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    selectedColor: DataTypes.BIGINT,
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
