module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Questions", "imageUrl", {
      type: Sequelize.STRING, // Adjust the data type accordingly
      allowNull: true, // You can change this to false if imageUrl is required
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Questions", "imageUrl");
  },
};
