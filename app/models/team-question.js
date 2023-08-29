// team-question.js
module.exports = (sequelize, DataTypes) => {
  const TeamQuestion = sequelize.define("TeamQuestion", {
    answeredCorrectly: DataTypes.BOOLEAN,
  });

  TeamQuestion.associate = (models) => {
    TeamQuestion.belongsTo(models.Team, { foreignKey: "teamId" });
    TeamQuestion.belongsTo(models.Question, {
      foreignKey: "questionId",
      as: "question",
    });
  };

  return TeamQuestion;
};
