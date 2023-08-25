module.exports = (sequelize, DataTypes) => {
  const Answer = sequelize.define("Answer", {
    answer: DataTypes.STRING,
  });

  return Answer;
};
