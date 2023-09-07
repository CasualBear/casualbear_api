module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    role: DataTypes.STRING,
    password: DataTypes.STRING,
    dateOfBirth: DataTypes.STRING,
    cc: DataTypes.STRING,
    phone: DataTypes.STRING,
    postalCode: DataTypes.STRING,
    address: DataTypes.STRING,
    nosCard: DataTypes.STRING,
    deviceIdentifier: DataTypes.STRING,
    tShirtSize: DataTypes.STRING,
    isCheckedPrivacyData: DataTypes.BOOLEAN,
    isCheckedTermsConditions: DataTypes.BOOLEAN,
    isCaptain: DataTypes.BOOLEAN,

    teamId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
  });

  User.associate = (models) => {
    // Define associations here
    User.belongsTo(models.Team, {
      foreignKey: "teamId",
      as: "team",
    });
  };

  return User;
};
