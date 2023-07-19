module.exports = (sequelize, DataTypes) => {
  const Answer = sequelize.define("Answer", {
    answer: DataTypes.TEXT,
    isCorrect: DataTypes.BOOLEAN,
  });

  Answer.associate = function (models) {
    Answer.belongsTo(models.TeamMember, {
      foreignKey: "teamMemberId",
    });
    Answer.belongsTo(models.Question, {
      foreignKey: "questionId",
    });
  };

  return Answer;
};
