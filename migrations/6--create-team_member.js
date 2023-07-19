module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.createTable("TeamMembers", {
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
        allowNull: false,
        type: DataTypes.STRING,
      },
      cc: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      phone: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      teamId: {
        allowNull: false,
        type: DataTypes.STRING, // Define the new teamId column
      },
      address: {
        allowNull: false,
        type: DataTypes.STRING, // Define the new teamId column
      },
      email: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
      },
      nosCard: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      tshirtSize: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      event_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        onDelete: "CASCADE",
        references: {
          model: "Events",
          key: "id",
        },
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable("TeamMembers");
  },
};