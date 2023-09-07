const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RevokedToken = sequelize.define("RevokedToken", {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Ensure each token is stored only once
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  return RevokedToken;
};
