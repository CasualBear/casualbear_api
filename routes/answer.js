const express = require("express");
const verify = require("./verifyToken");
const router = express.Router();
const {
  Answer,
  Question,
  Team,
  Event,
  TeamQuestion,
} = require("../app/models");
const { teamTrackingObjects } = require("./zoneUnlockingLogic"); // Provide the correct path to the zoneUnlockingLogic.js file

router.post("/answer-question", verify, async (req, res) => {
  const { teamId, questionId, answerIndex, timeSpent } = req.body;
  const { teamSockets } = req;

  try {
    const team = await Team.findByPk(teamId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const question = await Question.findByPk(questionId);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    var isCorrect;

    // Check if questionId is null
    if (answerIndex === null) {
      isCorrect = true;
    } else {
      isCorrect = parseInt(answerIndex) === question.correctAnswerIndex;
    }

    if (isCorrect) {
      team.totalPoints += question.points;
    }

    if (timeSpent) {
      team.timeSpent += timeSpent;
    }

    await team.save();

    const zone = question.zone;
    const correctAnswersInZone = await getCorrectAnswersInZone(teamId, zone);

    // Access the team-specific tracking object or create it if it doesn't exist
    const zonesUnlockedByCorrectAnswers = teamTrackingObjects[teamId] || {};

    if (isCorrect) {
      await TeamQuestion.create({
        teamId: team.id,
        questionId: question.id,
        answeredCorrectly: true,
      });

      // Check if the team has unlocked the next zone
      if (correctAnswersInZone + 1 >= 4) {
        const zones = JSON.parse(team.zones);

        const currentZoneIndex = zones.findIndex((z) => z.name === zone);

        if (currentZoneIndex !== -1 && currentZoneIndex < zones.length - 2) {
          const nextZoneName = zones[currentZoneIndex + 1].name;
          if (!zonesUnlockedByCorrectAnswers[nextZoneName]) {
            zones[currentZoneIndex + 1].active = true;
            zones[currentZoneIndex + 2].active = true;

            await team.update({ zones: JSON.stringify(zones) });
            // Update the tracking variable
            zonesUnlockedByCorrectAnswers[nextZoneName] = true;
          }
        } else if (currentZoneIndex === zones.length - 2 && zone === "ZoneD") {
          const nextZoneName = zones[currentZoneIndex + 1].name;
          if (!zonesUnlockedByCorrectAnswers[nextZoneName]) {
            zones[currentZoneIndex + 1].active = true;

            await team.update({ zones: JSON.stringify(zones) });
            // Update the tracking variable
            zonesUnlockedByCorrectAnswers[nextZoneName] = true;
          }
        }

        const teamSocket = teamSockets[teamId];
        if (teamSocket) {
          teamSocket.emit("ZonesChanged");
        }
      }

      const correctAnswersPerZone = await getCorrectAnswersPerZone(teamId);

      res.status(200).json({
        message: "Answer is correct. Points awarded.",
        correctAnswersPerZone,
      });
    } else {
      await TeamQuestion.create({
        teamId: team.id,
        questionId: question.id,
        answeredCorrectly: false,
      });

      res.status(200).json({
        message: "Answer is incorrect. No points awarded.",
        correctAnswersPerZone: await getCorrectAnswersPerZone(teamId),
      });
    }
  } catch (error) {
    console.error("Error answering question:", error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

async function getCorrectAnswersInZone(teamId, zone) {
  const teamQuestions = await TeamQuestion.findAll({
    where: { teamId },
    include: {
      model: Question,
      as: "question", // Specify the alias you used for the association
      where: { zone },
    },
  });

  const correctAnswersCount = teamQuestions.reduce((count, teamQuestion) => {
    return count + (teamQuestion.answeredCorrectly ? 1 : 0);
  }, 0);

  return correctAnswersCount;
}

async function getCorrectAnswersPerZone(teamId) {
  const zones = [
    "ZoneA",
    "ZoneAChallenges",
    "ZoneB",
    "ZoneBChallenges",
    "ZoneC",
    "ZoneCChallenges",
    "ZoneD",
    "ZoneDChallenges",
  ];

  const correctAnswersPerZone = {};
  for (const zone of zones) {
    correctAnswersPerZone[zone] = await getCorrectAnswersInZone(teamId, zone);
  }

  return correctAnswersPerZone;
}

router.get("/teams", verify, async (req, res) => {
  try {
    // Retrieve all teams from the database, ordered by points and timeSpent
    const teams = await Team.findAll({
      order: [
        ["totalPoints", "DESC"], // Order by points in descending order
        ["timeSpent", "ASC"], // If points are the same, order by timeSpent in ascending order
      ],
    });

    res.status(200).json({ teams: teams });
  } catch (error) {
    console.error("Error retrieving teams:", error);
    res.status(500).json({ error: "Failed to retrieve teams" });
  }
});

module.exports = router;
