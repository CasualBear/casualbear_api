const { Event, TeamMember, Question } = require("../app/models");
const router = require("express").Router();
const path = require("path");
const AWS = require("aws-sdk");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const app = express();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer);

// Set up Multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/"); // Set the destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix); // Set the filename for the uploaded file
  },
});

const upload = multer({ storage });

// Configure AWS credentials
AWS.config.update({
  accessKeyId: "AKIAYTNOFOJOVWK54WQG",
  secretAccessKey: "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",
  region: "us-east-1",
});

// Create an S3 client instance
const s3 = new AWS.S3();

function generateRandomKey() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 10;
  let key = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    key += characters[randomIndex];
  }

  return key;
}

function uploadImageToS3(filePath, bucketName, objectKey) {
  // Read the image file
  const fs = require("fs");
  const fileContent = fs.readFileSync(filePath);

  // Set S3 parameters
  const params = {
    Bucket: bucketName,
    Key: objectKey,
    Body: fileContent,
  };

  // Upload the image file to S3
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Location);
      }
    });
  });
}
// Define the route for uploading the event
router.post("/upload-event", upload.single("iconFile"), async (req, res) => {
  try {
    // Get the base directory path
    const baseDirectory = __dirname;

    // Join the base directory path with "uploads" folder
    const uploadsDirectory = path.join(baseDirectory, "uploads");

    const filePath = (
      uploadsDirectory.replace("/routes", "") +
      "/" +
      req.file.filename
    ) // TODO change this to fetch the path and send to S3
      .trim();
    const bucketName = "casualbearapi-staging";
    const randomKey = generateRandomKey();
    const objectKey = randomKey + ".jpg";

    const s3Url = await uploadImageToS3(filePath, bucketName, objectKey);

    const selectedColorInt = parseInt(req.body.selectedColor);

    const zones = [
      { name: "ZoneA", active: true },
      { name: "ZoneB", active: false },
      { name: "ZoneC", active: false },
    ];

    const event = await Event.create({
      name: req.body.name,
      description: req.body.description,
      selectedColor: selectedColorInt,
      rawUrl: s3Url,
      zones: JSON.stringify(zones),
    });

    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: error });
  }
});

router.get("/events", async (req, res) => {
  try {
    // Retrieve all events from the database
    const events = await Event.findAll({
      include: {
        model: Question,
        as: "questions",
      },
    });

    // Parse the zones field as a JSON array for each event
    const eventsWithParsedZones = events.map((event) => {
      const parsedZones = JSON.parse(event.zones);
      return {
        ...event.toJSON(),
        zones: parsedZones.map((zone) => ({
          name: zone.name,
          active: zone.active,
        })),
      };
    });

    // Parse the answers field as a JSON array for each question in each event
    const eventsWithParsedQuestions = eventsWithParsedZones.map((event) => {
      const parsedQuestions = (event.questions || []).map((question) => {
        const parsedAnswers = JSON.parse(question.answers);
        return {
          ...question,
          answers: parsedAnswers,
        };
      });

      return {
        ...event,
        questions: parsedQuestions,
      };
    });

    res.status(200).json({ events: eventsWithParsedQuestions });
  } catch (error) {
    console.error("Error retrieving events:", error);
    res.status(500).json({ error: "Failed to retrieve events" });
  }
});

// GET method to fetch event data
router.get("/events/:eventId", async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Find the event by its ID in the database
    const event = await Event.findByPk(eventId, {
      include: {
        model: Question,
        as: "questions",
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    // Parse the zones field as a JSON array for the event
    const parsedZones = event.zones.split(", ").map((zone) => zone.trim());
    const parsedEvent = {
      ...event.toJSON(),
      zones: parsedZones.map((zone) => ({
        name: zone,
        active: false, // Set the default activation state to false
      })),
    };

    // Parse the answers field as a JSON array for each question in the event
    const parsedQuestions = (parsedEvent.questions || []).map((question) => {
      const parsedAnswers = JSON.parse(question.answers);
      return {
        ...question,
        answers: parsedAnswers,
      };
    });

    // Include the parsed questions in the parsed event
    parsedEvent.questions = parsedQuestions;

    // Send the parsed event as the response
    res.json({ event: parsedEvent });
  } catch (error) {
    // Handle any errors that occurred during event retrieval
    console.error("Error retrieving event:", error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving the event." });
  }
});

// DELETE method to delete an event
router.delete("/events/:eventId", async (req, res) => {
  try {
    const bucketName = "casualbearapi-staging";
    const eventId = req.params.eventId;

    // Find the event by its ID in the database
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    // Delete the event from the database
    await event.destroy();

    // Delete the image from the S3 bucket
    const objectKey = event.rawUrl.split("/").pop(); // Extract the object key from the S3 URL
    await s3.deleteObject({ Bucket: bucketName, Key: objectKey }).promise();

    res.status(204).end(); // Return a success response with no content
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

router.put("/events/:eventId", upload.single("iconFile"), async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Find the event by its ID in the database
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    // Update the event properties
    event.name = req.body.name;
    event.description = req.body.description;
    event.selectedColor = parseInt(req.body.selectedColor);

    // Check if a new image is uploaded
    if (req.file) {
      const filePath = req.file.path; // Path of the newly uploaded image
      const bucketName = "casualbearapi-staging";
      const randomKey = generateRandomKey();
      const objectKey = randomKey + ".jpg";

      // Delete the existing image from the S3 bucket
      const existingObjectKey = event.rawUrl.split("/").pop();
      await s3
        .deleteObject({ Bucket: bucketName, Key: existingObjectKey })
        .promise();

      // Upload the new image to the S3 bucket
      const s3Url = await uploadImageToS3(filePath, bucketName, objectKey);

      // Update the event's rawUrl with the S3 URL of the new image
      event.rawUrl = s3Url;
    }

    // Save the updated event
    await event.save();

    // Return the updated event as the response
    res.json({ event });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// add teams to the event
router.post("/team-members", async (req, res) => {
  const teamMembersData = req.body;

  try {
    const createdTeamMembers = [];
    const teamId = uuidv4(); // Generate a random team ID
    for (const teamMemberData of teamMembersData) {
      const newTeamMember = await TeamMember.create({
        ...teamMemberData,
        teamId, // Assign the generated team ID to the teamId column
      });
      createdTeamMembers.push(newTeamMember);
    }

    const event = await Event.findOne(); // Adjust the conditions to find the appropriate event

    await Promise.all(
      createdTeamMembers.map((teamMember) => teamMember.setEvent(event))
    );

    res.status(201).json(createdTeamMembers);
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve team members",
      stack: error.stack, // Include the stack trace in the response
    });
  }
});

// Find users by team
router.get("/team-members/:teamId", async (req, res) => {
  const teamId = req.params.teamId;

  try {
    const teamMembers = await TeamMember.findAll({
      where: {
        teamId: teamId,
      },
    });

    res.status(200).json(teamMembers);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve team members" });
  }
});

// Find users by event
router.get("/team-members/event/:eventId", async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const event = await Event.findByPk(eventId, {
      include: {
        model: TeamMember,
        as: "TeamMembers", // Make sure to use the correct alias for the association
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const teamMembers = event.TeamMembers;
    res.status(200).json(teamMembers);
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve team members",
      stack: error.stack, // Include the stack trace in the response
    });
  }
});

// add question to event
router.post("/events/:eventId/questions", async (req, res) => {
  const { eventId } = req.params;
  const {
    question,
    answers,
    correctAnswerIndex,
    zones,
    latitude,
    longitude,
    address,
  } = req.body;

  try {
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    let serializedAnswers = null;

    if (answers) {
      serializedAnswers = answers.map((answer, index) => ({
        index: index,
        answer: answer,
      }));
    }

    const newQuestion = await Question.create({
      question,
      answers: serializedAnswers ? JSON.stringify(serializedAnswers) : null,
      correctAnswerIndex,
      zones: JSON.stringify(zones),
      latitude,
      longitude,
      address,
      eventId,
    });

    res.status(201).json(newQuestion);
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ error: "Failed to create question" });
  }
});

// update zone from event

router.put("/events/:eventId/zones/:zoneName", async (req, res) => {
  const { eventId, zoneName } = req.params;
  const { state } = req.body;

  try {
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    let zones = [];
    try {
      zones = JSON.parse(event.zones);
    } catch (error) {
      console.error("Error parsing zones:", error);
    }

    // Find the zone with the matching zoneName
    const zoneToUpdate = zones.find((zone) => zone.name === zoneName);

    if (!zoneToUpdate) {
      return res.status(404).json({ error: "Zone not found" });
    }

    // Update the 'active' property of the zone based on the state value
    zoneToUpdate.active = state === "active";

    // Update the zones in the event
    event.zones = JSON.stringify(zones);
    await event.save();

    // Emit the updated zone and its state to all connected clients
    io.emit("zoneUpdate", {
      zone: zoneToUpdate.name,
      active: zoneToUpdate.active,
    });

    res.status(200).json({ message: "Zone state updated successfully" });
  } catch (error) {
    console.error("Error updating zone state:", error);
    res.status(500).json({ error: "Failed to update zone state" });
  }
});

module.exports = router;
