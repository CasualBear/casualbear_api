const { Op } = require("sequelize");
const verify = require("./verifyToken");
const moment = require("moment-timezone");

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
const { teamTrackingObjects } = require("./zoneUnlockingLogic"); // Provide the correct path to the zoneUnlockingLogic.js file

let intervalId;

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
    const events = await Event.findAll();

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
    const event = await Event.findByPk(eventId, {});

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
    imageUrl,
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
      imageUrl,
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

/**
 * Get questions by event
 */

router.get("/events/:eventId/questions", async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const questions = await Question.findAll({
      where: { eventId }, // Filter questions by eventId
      include: [
        {
          model: Answer,
          as: "answers", // Include associated answers
        },
      ],
    });

    res.status(200).json(questions);
  } catch (error) {
    console.error("Error retrieving questions:", error);
    res.status(500).json({ error: "Failed to retrieve questions" });
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

/**
 * Get question details by team
 */
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

/**
 * reset event
 */
router.post("/event/reset/:eventId", verify, async (req, res) => {
  const eventId = req.params.eventId;
  const { io } = req;

  try {
    // resets the timer to unlock zones from the teams
    clearInterval(intervalId);

    const predefinedZones = [
      { name: "ZoneA", active: true },
      { name: "ZoneAChallenges", active: false },
      { name: "ZoneB", active: false },
      { name: "ZoneBChallenges", active: false },
      { name: "ZoneC", active: false },
      { name: "ZoneCChallenges", active: false },
      { name: "ZoneD", active: false },
      { name: "ZoneDChallenges", active: false },
    ];

    const zonesAsString = JSON.stringify(predefinedZones);

    //update teams to only have ZoneA Unlocked
    Team.update({ zones: zonesAsString }, { where: {} })
      .then(() => {
        console.log("All teams except Zone A are locked.");
      })
      .catch((error) => {
        console.error("Error updating teams:", error);
      });

    // Reset all team points to 0
    Team.update({ totalPoints: 0 }, { where: {} })
      .then(() => {
        console.log("All team points have been reset to 0.");
      })
      .catch((error) => {
        console.error("Error resetting team points:", error);
      });

    // Delete all answers correctly from the table relation
    TeamQuestion.update({ answeredCorrectly: false }, { where: {} })
      .then(() => {
        console.log(
          "answeredCorrectly set to false for all TeamQuestion entries."
        );
      })
      .catch((error) => {
        console.error("Error updating answeredCorrectly:", error);
      });

    // Update the Event table to set hasStarted to true for the specified eventId
    await Event.update(
      { hasStarted: "pre_game" },
      {
        where: { id: eventId },
      }
    );

    // Emit the game started event
    io.emit("PreGame");

    res.status(200).json({
      message: "Game Reseted",
    });
  } catch (error) {
    console.error("Error reseting game:", error);
    res.status(500).json({ error: "Failed to reset game" });
  }
});

router.post("/event/start/:eventId", verify, async (req, res) => {
  const eventId = req.params.eventId;
  const { io } = req;

  try {
    const event = await Event.findOne({
      where: {
        id: eventId,
      },
    });

    // Calculate the eventInitHour with Portugal time zone
    const portugalTime = moment.tz("Europe/Lisbon");
    const eventInitHour = portugalTime.valueOf(); // Get timestamp in milliseconds

    // Update the Event table to set hasStarted to true and eventInitHour
    await Event.update(
      {
        hasStarted: "game_started",
        eventInitHour: eventInitHour,
      },
      {
        where: { id: eventId },
      }
    );

    // Update the event object with the calculated eventInitHour
    event.eventInitHour = eventInitHour;

    // Emit the game started event
    io.emit(
      "GameStarted",
      JSON.stringify({
        eventInitHour: event.eventInitHour,
      })
    );

    const performZoneUnlockingLogic = () => {
      performZoneUnlockingLogicForAllTeams(io);
    };

    intervalId = setInterval(performZoneUnlockingLogic, 10000); // 25 seconds in milliseconds

    res.status(200).json({
      message: "Game started",
    });
  } catch (error) {
    console.error("Error starting game:", error);
    res.status(500).json({ error: "Failed to start game" });
  }
});

router.post("/event/stop/:eventId", verify, async (req, res) => {
  const eventId = req.params.eventId;
  const { io } = req;
  try {
    // Update the Event table to set hasStarted to true
    await Event.update(
      { hasStarted: "game_ended" },
      {
        where: { id: eventId },
      }
    );

    // resets the timer to unlock zones from the teams
    clearInterval(intervalId);

    // Emit the game started event
    io.emit("GameEnded");

    res.status(200).json({
      message: "Game Ended",
    });
  } catch (error) {
    console.error("Error ending game:", error);
    res.status(500).json({ error: "Failed to end game" });
  }
});

async function performZoneUnlockingLogicForAllTeams(io) {
  try {
    const teams = await Team.findAll();

    for (const team of teams) {
      const zones = JSON.parse(team.zones);

      const teamId = team.id;

      // Access the team-specific tracking object or create it if it doesn't exist
      const zonesUnlockedByCorrectAnswers = teamTrackingObjects[teamId] || {};

      // Find the last active zone
      let lastActiveZoneIndex = -1;
      for (let i = zones.length - 1; i >= 0; i--) {
        if (zones[i].active) {
          lastActiveZoneIndex = i;
          break;
        }
      }

      if (
        lastActiveZoneIndex !== -1 &&
        lastActiveZoneIndex < zones.length - 2
      ) {
        const nextZoneName = zones[lastActiveZoneIndex + 1].name;
        if (!zonesUnlockedByCorrectAnswers[nextZoneName]) {
          zones[lastActiveZoneIndex + 1].active = true;
          zones[lastActiveZoneIndex + 2].active = true;

          await team.update({ zones: JSON.stringify(zones) });
        }
      } else if (
        lastActiveZoneIndex === zones.length - 2 &&
        zones[lastActiveZoneIndex].name === "ZoneD"
      ) {
        const nextZoneName = zones[lastActiveZoneIndex + 1].name;
        if (!zonesUnlockedByCorrectAnswers[nextZoneName]) {
          zones[lastActiveZoneIndex + 1].active = true;

          await team.update({ zones: JSON.stringify(zones) });
        }
      }

      io.emit("ZonesChanged");
    }
  } catch (error) {
    console.error("Error performing zone unlocking logic:", error);
  }
}

module.exports = router;
