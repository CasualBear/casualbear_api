module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Events", "eventInitHour", {
      type: Sequelize.BIGINT, // Assuming you want to store milliseconds as a BIGINT
      allowNull: false,
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("Events", "eventInitHour");
  },
};
