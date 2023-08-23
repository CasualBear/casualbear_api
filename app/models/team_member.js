module.exports = (sequelize, DataTypes) => {
  const TeamMember = sequelize.define("TeamMember", {
    name: DataTypes.STRING,
    dateOfBirth: DataTypes.STRING,
    cc: DataTypes.STRING,
    phone: DataTypes.STRING,
    address: DataTypes.STRING,
    email: DataTypes.STRING,
    nosCard: DataTypes.STRING,
    tShirtSize: DataTypes.STRING,
    isCheckedPrivacyData: DataTypes.BOOLEAN,
    isCheckedTermsConditions: DataTypes.BOOLEAN,
    isCheckedOverall: DataTypes.BOOLEAN,
    isCaptain: DataTypes.BOOLEAN,
    isVerified: DataTypes.BOOLEAN,
    isCheckedIn: DataTypes.BOOLEAN,
    teamId: DataTypes.STRING, // Add the teamId column
  });

  TeamMember.associate = function (models) {
    TeamMember.belongsTo(models.Event, {
      foreignKey: "event_id",
      onDelete: "CASCADE",
    });
    TeamMember.hasMany(models.Answer, {
      foreignKey: "teamMemberId",
    });
  };

  return TeamMember;
};
