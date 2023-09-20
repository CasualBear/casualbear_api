const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const schedule = require("node-schedule");
const { TeamLocation } = require("./app/models");
const moment = require("moment-timezone");
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const router = express.Router();
const { Answer, Question, Team, Event, TeamQuestion } = require("./app/models");

// Import Routes
const authRoute = require("./routes/auth");
const eventRoute = require("./routes/event");
const answersRouter = require("./routes/answer");
const teamsRouter = require("./routes/team");

dotenv.config();
// Middleware
app.use(cors());
app.use(express.json());

const teamSockets = {}; // A mapping of team IDs to socket instances

io.on("connection", (socket) => {
  socket.on("joinTeamRoom", (teamId) => {
    socket.join(teamId);
    console.log(`Socket ${socket.id} is joining room: ${teamId}`);
    teamSockets[teamId] = socket; // Store the socket instance associated with the team
  });

  socket.on("locationUpdated", async (locationData) => {
    const { latitude, longitude, teamId } = locationData;

    try {
      // Create a new TeamLocation record
      await TeamLocation.create({
        teamId,
        latitude,
        longitude,
      });

      // TODO emit in socket
      io.emit("locationSaved", savedLocation.toJSON());

      console.log(
        `Location Updated for Team ${teamId}: Latitude ${latitude}, Longitude ${longitude}`
      );
    } catch (error) {
      console.error("Error saving location data:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
    // Remove the socket instance from the mapping if needed
    for (const [teamId, teamSocket] of Object.entries(teamSockets)) {
      if (teamSocket === socket) {
        delete teamSockets[teamId];
        break;
      }
    }
    // Handle socket disconnection if needed
  });
});

/*
// Schedule socket events
const timeZone = "Europe/Lisbon";
const gameStartTime = moment.tz("01:24:00", timeZone);
const gameEndTime = moment.tz("01:25:00", timeZone);

// Schedule game started event at 03:15:40 GMT+3
schedule.scheduleJob(gameStartTime.toDate(), () => {
  io.emit("GameStarted", "The game has started!");
});

// Schedule game ended event at the end of the game duration
schedule.scheduleJob(gameEndTime.toDate(), () => {
  io.emit("GameEnded", "The game has ended!");
});
*/

// Route Middleware
app.use("/api/user", authRoute);
app.use(
  "/api/event",
  (req, res, next) => {
    req.io = io;
    req.teamSockets = teamSockets;
    next();
  },
  eventRoute
);
app.use(
  "/api/answers",
  (req, res, next) => {
    req.teamSockets = teamSockets; // Attach teamSockets to the request object
    next();
  },
  answersRouter
);
app.use(
  "/api/teams",
  (req, res, next) => {
    req.teamSockets = teamSockets; // Attach teamSockets to the request object
    next();
  },
  teamsRouter
);

// Start the server
const port = process.env.PORT || 8000;
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
