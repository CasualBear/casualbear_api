const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Import Routes
const authRoute = require("./routes/auth");
const eventRoute = require("./routes/event");

dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A client has connected to the socket");

  socket.on("disconnect", () => {
    console.log("A client has disconnected from the socket");
  });
});

// Route Middleware
app.use("/api/user", authRoute);
app.use("/api/event", eventRoute);

// Start the server
httpServer.listen(process.env.PORT || 8000, () => {
  console.log("Server is running on port 8000");
});
