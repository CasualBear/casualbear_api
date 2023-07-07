const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");

// Import Routes
const authRoute = require("./routes/auth");
const eventRoute = require("./routes/event");

dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// Route Middleware
app.use("/api/user", authRoute);
app.use("/api/event", eventRoute);

app.listen(process.env.PORT || 8000);
