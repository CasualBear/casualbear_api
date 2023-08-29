"use strict";

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface
      .createTable("Events", {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        selectedColor: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        rawUrl: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          allowNull: false,
          type: DataTypes.DATE,
        },
      })
      .then(() => {
        return queryInterface.createTable("Questions", {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          question: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          answeredCorrectly: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
          },
          isVisible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          answers: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          correctAnswerIndex: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          points: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          zone: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          latitude: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          longitude: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          address: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          eventId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: "Events",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updatedAt: {
            allowNull: false,
            type: DataTypes.DATE,
          },
        });
      });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable("Questions").then(() => {
      return queryInterface.dropTable("Events");
    });
  },
};
