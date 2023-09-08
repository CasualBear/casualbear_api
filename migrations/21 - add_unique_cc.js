module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add unique constraints to the email and cc columns
    await queryInterface.addConstraint("Users", {
      fields: ["cc"],
      type: "unique",
      name: "unique_cc_constraint",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the unique constraints if necessary
    await queryInterface.removeConstraint("Users", "unique_cc_constraint");
  },
};
