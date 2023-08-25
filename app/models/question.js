module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define("Question", {
    question: DataTypes.STRING,
    correctAnswerIndex: DataTypes.INTEGER,
    points: DataTypes.INTEGER,
    zone: DataTypes.STRING,
    latitude: DataTypes.STRING,
    longitude: DataTypes.STRING,
    address: DataTypes.STRING,
  });

  Question.associate = function (models) {
    Question.belongsTo(models.Event, {
      foreignKey: "eventId",
    });
    Question.hasMany(models.Answer, {
      foreignKey: "questionId",
    });
  };

  return Question;
};
