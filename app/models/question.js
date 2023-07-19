module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define("Question", {
    question: DataTypes.STRING,
    answers: DataTypes.TEXT,
    correctAnswerIndex: DataTypes.INTEGER,
    zone: DataTypes.STRING,
    latitude: DataTypes.STRING,
    longitude: DataTypes.STRING,
    address: DataTypes.STRING,
  });

  Question.associate = function (models) {
    Question.belongsTo(models.Event, {
      foreignKey: "eventId",
    });
  };

  return Question;
};