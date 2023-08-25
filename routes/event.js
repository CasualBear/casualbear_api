const { Event, Question } = require("../app/models");
const router = require("express").Router();
const path = require("path");
const AWS = require("aws-sdk");
const multer = require("multer");

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
      },
    });

    res.status(200).json({ events: events });
  } catch (error) {
    console.error("Error retrieving events:", error);
    res.status(500).json({ error: "Failed to retrieve events" });
  }
});

router.get("/events/:eventId", async (req, res) => {
  const eventId = req.params.eventId;

  try {
    // Retrieve the event with the specified ID from the database
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: Question,
          as: "questions",
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json({ event: event });
  } catch (error) {
    console.error("Error retrieving event:", error);
    res.status(500).json({ error: "Failed to retrieve event" });
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

// add question to event
router.post("/events/:eventId/questions", async (req, res) => {
  const { eventId } = req.params;
  const {
    question,
    answers,
    correctAnswerIndex,
    zone,
    latitude,
    longitude,
    address,
  } = req.body;

  try {
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ error: "Question not added" });
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
      zone, // Save the zone as a single string
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

// Update a question
router.put("/questions/:questionId", async (req, res) => {
  const { questionId } = req.params;
  const {
    question,
    answers,
    correctAnswerIndex,
    zone,
    latitude,
    longitude,
    address,
  } = req.body;

  try {
    const existingQuestion = await Question.findByPk(questionId);

    if (!existingQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }

    let serializedAnswers = null;

    if (answers) {
      serializedAnswers = answers.map((answer, index) => ({
        index: index,
        answer: answer,
      }));
    }

    await existingQuestion.update({
      question: question || existingQuestion.question,
      answers: serializedAnswers
        ? JSON.stringify(serializedAnswers)
        : existingQuestion.answers,
      correctAnswerIndex:
        correctAnswerIndex || existingQuestion.correctAnswerIndex,
      zone: zone || existingQuestion.zone,
      latitude: latitude || existingQuestion.latitude,
      longitude: longitude || existingQuestion.longitude,
      address: address || existingQuestion.address,
    });

    res.status(200).json({ message: "Question updated successfully" });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
});

// Delete a question
router.delete("/questions/:questionId", async (req, res) => {
  const { questionId } = req.params;

  try {
    const question = await Question.findByPk(questionId);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    await question.destroy();

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Failed to delete question" });
  }
});

// Get questions by zone and event ID
router.get("/questions/:eventId/:zoneName", async (req, res) => {
  try {
    const { eventId, zoneName } = req.params;

    // Find the event by its ID in the database
    const event = await Event.findByPk(eventId, {
      include: {
        model: Question,
        as: "questions",
        where: { zone: zoneName },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Questions not found" });
    }

    const questions = event.questions;

    res.status(200).json({ questions });
  } catch (error) {
    console.error("Error retrieving questions by zone and event ID:", error);
    res.status(500).json({ error: "Failed to retrieve questions" });
  }
});

module.exports = router;
