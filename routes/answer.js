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

    // Check if the team has already answered this question
    const hasAnswered = await TeamQuestion.findOne({
      where: {
        teamId: team.id,
        questionId: question.id,
      },
    });

    if (hasAnswered) {
      return res.status(400).json({ error: "Question already answered" });
    }

    var isCorrect;
    var isChallenge;

    // Check if questionId is null
    if (answerIndex === null) {
      isCorrect = true;
      isChallenge = true;
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

    if (isCorrect && !isChallenge) {
      await TeamQuestion.create({
        teamId: team.id,
        questionId: question.id,
        answeredCorrectly: true,
      });

      // Check if the team has unlocked the next zone
      if (correctAnswersInZone + 1 == 4) {
        const zones = JSON.parse(team.zones);

        const currentZoneIndex = zones.findIndex((z) => z.name === zone);

        if (currentZoneIndex !== -1 && currentZoneIndex < zones.length - 2) {
          zones[currentZoneIndex + 1].active = true;
          zones[currentZoneIndex + 2].active = true;

          await team.update({ zones: JSON.stringify(zones) });
        } else if (currentZoneIndex === zones.length - 2 && zone === "ZoneD") {
          zones[currentZoneIndex + 1].active = true;

          await team.update({ zones: JSON.stringify(zones) });
        }

        const teamSocket = teamSockets[team.id];
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
