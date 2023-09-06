// team-question.js
module.exports = (sequelize, DataTypes) => {
  const RevokedToken = sequelize.define("RevokedToken", {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return RevokedToken;
};
