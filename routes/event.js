const { Op } = require("sequelize");
const express = require("express");
const verify = require("./verifyToken");
const app = express();
const httpServer = require("http").createServer(app);

const {
  Event,
  Question,
  Team,
  Answer,
  TeamQuestion,
} = require("../app/models");
const router = require("express").Router();
const path = require("path");
const AWS = require("aws-sdk");
const multer = require("multer");
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

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

    const event = await Event.create({
      name: req.body.name,
      description: req.body.description,
      selectedColor: selectedColorInt,
      rawUrl: s3Url,
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
        include: [
          {
            model: Answer,
            as: "answers", // Include associated answers
          },
        ],
      },
    });

    res.status(200).json({ events: events });
  } catch (error) {
    console.error("Error retrieving events:", error);
    res.status(500).json({ error: "Failed to retrieve events" });
  }
});

router.get("/events/:eventId", verify, async (req, res) => {
  const eventId = req.params.eventId;

  try {
    // Retrieve the event with the specified ID from the database
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: Question,
          as: "questions",
          include: [
            {
              model: Answer,
              as: "answers", // Include associated answers
            },
          ],
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Find teams inside the event
    const teams = await Team.findAll({
      where: { eventId }, // Fetch teams where eventId matches
      include: "members", // Include associated users/members
    });

    // Include teams within the event object
    const eventWithTeams = {
      ...event.toJSON(),
      teams: teams,
    };

    res.status(200).json({ event: eventWithTeams });
  } catch (error) {
    console.error("Error retrieving event:", error);
    res.status(500).json({ error: "Failed to retrieve event" });
  }
});

// DELETE method to delete an event
router.delete("/events/:eventId", verify, async (req, res) => {
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

router.put(
  "/events/:eventId",
  verify,
  upload.single("iconFile"),
  async (req, res) => {
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
  }
);

// add question to event
router.post("/events/:eventId/questions", verify, async (req, res) => {
  const { eventId } = req.params;
  const {
    question,
    answers,
    correctAnswerIndex,
    zone,
    points,
    latitude,
    longitude,
    isVisible,
    address,
  } = req.body;

  try {
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const newQuestion = await Question.create({
      question,
      correctAnswerIndex,
      zone,
      latitude,
      longitude,
      address,
      points,
      isVisible,
      eventId,
    });

    const savedAnswers = [];

    // Loop through the answers and associate them with the question
    for (const a of answers) {
      const { answer } = a;

      const savedAnswer = await Answer.create({
        answer: answer,
        questionId: newQuestion.id, // Associate the answer with the new question
      });

      savedAnswers.push(savedAnswer);
    }

    newQuestion.setAnswers(savedAnswers); // Associate all saved answers with the new question

    res.status(201).json(newQuestion);
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ error: "Failed to create question" });
  }
});

// Delete a question
router.delete("/questions/:questionId", verify, async (req, res) => {
  const { questionId } = req.params;

  try {
    // Find the question by its ID
    const existingQuestion = await Question.findByPk(questionId);

    if (!existingQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Delete the associated answers first
    await Answer.destroy({
      where: {
        questionId: questionId,
      },
    });

    // Delete the question itself
    await existingQuestion.destroy();

    res.status(200).json({
      message: "Question and associated answers deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Failed to delete question" });
  }
});

router.get("/events/:eventId/questions/:teamId", verify, async (req, res) => {
  const { eventId, teamId } = req.params;

  try {
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const team = await Team.findByPk(teamId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const questions = await Question.findAll({
      where: { eventId },
      include: [
        {
          model: Answer,
          as: "answers",
        },
        {
          model: Team,
          as: "Teams", // Correct alias here
          through: {
            attributes: ["answeredCorrectly"],
            where: { teamId },
          },
          required: false,
        },
      ],
    });

    const activeZones = JSON.parse(team.zones)
      .filter((zone) => zone.active)
      .map((zone) => zone.name);

    // Filter questions belonging to active zones
    const activeZoneQuestions = questions.filter((question) => {
      return activeZones.includes(question.zone);
    });

    const formattedQuestions = activeZoneQuestions.map((question) => {
      const answeredCorrectly =
        question.Teams.length > 0
          ? question.Teams[0].TeamQuestion.answeredCorrectly
          : null;
      const { Teams, ...formattedQuestion } = question.toJSON();
      formattedQuestion.answeredCorrectly = answeredCorrectly;
      return formattedQuestion;
    });

    res.status(200).json({ questions: formattedQuestions });
  } catch (error) {
    console.error("Error retrieving questions:", error);
    res.status(500).json({ error: "Failed to retrieve questions" });
  }
});

router.post("/event/start", verify, async (req, res) => {
  try {
    io.emit("GameStarted", "The game has started!");
    res.status(200).json({
      message: "Game started",
    });
  } catch (error) {
    console.error("Error starting game:", error);
    res.status(500).json({ error: "Failed to start game" });
  }
});

router.post("/event/stop", verify, async (req, res) => {
  try {
    io.emit("GameEnded", "The game has ended!");
    res.status(200).json({
      message: "Game Ended",
    });
  } catch (error) {
    console.error("Error starting game:", error);
    res.status(500).json({ error: "Failed to end game" });
  }
});

module.exports = router;
