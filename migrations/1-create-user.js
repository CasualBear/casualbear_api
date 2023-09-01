module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      dateOfBirth: {
        allowNull: true,
        type: DataTypes.STRING, // You might want to use DataTypes.DATE if storing a date.
      },
      postalCode: {
        allowNull: true,
        type: DataTypes.STRING, // You might want to use DataTypes.DATE if storing a date.
      },
      cc: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      phone: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      address: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      email: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      password: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      nosCard: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      tShirtSize: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      isCheckedPrivacyData: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
      },
      isCheckedTermsConditions: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
      },
      isCaptain: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
      },

      role: {
        allowNull: true,
        type: DataTypes.STRING,
      },

      teamId: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      event_id: {
        allowNull: true,
        type: DataTypes.INTEGER, // You might want to adjust the data type accordingly.
      },
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable("Users");
  },
};
