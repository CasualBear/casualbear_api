module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn("Events", "hasStarted", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "pre_game", // Set the default value to "pre_game"
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn("Events", "hasStarted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false, // Set the default value as a boolean
    });
  },
};
