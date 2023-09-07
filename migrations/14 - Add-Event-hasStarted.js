module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Events", "hasStarted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false, // You can set the default value as needed
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("Events", "hasStarted");
  },
};
