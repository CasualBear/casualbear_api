const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Import Routes
const authRoute = require("./routes/auth");
const eventRoute = require("./routes/event");
const answersRouter = require("./routes/answer");
const teamsRouter = require("./routes/team");

dotenv.config();
// Middleware
app.use(cors());
app.use(express.json());

var connectedSocket;

const teamSockets = {}; // A mapping of team IDs to socket instances

io.on("connection", (socket) => {
  socket.on("joinTeamRoom", (teamId) => {
    socket.join(teamId);
    console.log(`Socket ${socket.id} is joining room: ${teamId}`);
    teamSockets[teamId] = socket; // Store the socket instance associated with the team
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

// Route Middleware
app.use("/api/user", authRoute);
app.use("/api/event", eventRoute);
app.use("/api/answers", answersRouter);
app.use(
  "/api/teams",
  (req, res, next) => {
    req.teamSockets = teamSockets; // Attach teamSockets to the request object
    next();
  },
  teamsRouter
);

// Start the server
httpServer.listen(process.env.PORT || 8000, () => {
  console.log("Server is running on port 8000");
});
