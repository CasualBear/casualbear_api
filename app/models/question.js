module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define("Question", {
    question: DataTypes.STRING,
    correctAnswerIndex: DataTypes.INTEGER,
    points: DataTypes.INTEGER,
    zone: DataTypes.STRING,
    latitude: DataTypes.STRING,
    longitude: DataTypes.STRING,
    isVisible: DataTypes.BOOLEAN,
    imageUrl: DataTypes.STRING,
    address: DataTypes.STRING,
  });

  Question.associate = (models) => {
    Question.belongsTo(models.Event, { foreignKey: "eventId" });
    Question.hasMany(models.Answer, {
      as: "answers",
      foreignKey: "questionId",
    });
    Question.belongsToMany(models.Team, {
      through: models.TeamQuestion,
      foreignKey: "questionId",
    });
  };

  return Question;
};
