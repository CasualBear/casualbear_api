module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.createTable("Teams", {
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
      zones: {
        type: DataTypes.TEXT, // Use TEXT data type for JSON-like data
        allowNull: false,
        defaultValue: JSON.stringify([]), // Default value can be an empty JSON array
      },
      eventId: {
        allowNull: true,
        type: DataTypes.INTEGER,
        references: {
          model: "Events", // Make sure this matches the actual table name
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable("Teams");
  },
};
