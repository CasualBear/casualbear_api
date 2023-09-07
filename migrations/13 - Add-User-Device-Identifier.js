module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Users", "deviceIdentifier", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn("Users", "deviceIdentifier");
  },
};
