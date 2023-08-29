const express = require("express");
const router = express.Router();
const {
  Answer,
  Question,
  Team,
  Event,
  TeamQuestion,
} = require("../app/models");

router.post("/answer-question", async (req, res) => {
  const { teamId, questionId, answerIndex, timeSpent } = req.body;

  try {
    // Find the team by its ID
    const team = await Team.findByPk(teamId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Find the question by its ID
    const question = await Question.findByPk(questionId);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Check if the provided answer index matches the correctAnswerIndex
    const isCorrect = parseInt(answerIndex) === question.correctAnswerIndex;

    // Update the team's total points and time spent based on the question's outcome
    if (isCorrect) {
      team.totalPoints += question.points;
    }

    if (timeSpent) {
      team.timeSpent += timeSpent;
    }

    await team.save();

    // Create an entry in TeamQuestions table
    await TeamQuestion.create({
      teamId: team.id,
      questionId: question.id,
      answeredCorrectly: isCorrect,
    });

    if (isCorrect) {
      res.status(200).json({ message: "Answer is correct. Points awarded." });
    } else {
      res
        .status(200)
        .json({ message: "Answer is incorrect. No points awarded." });
    }
  } catch (error) {
    console.error("Error answering question:", error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

router.get("/teams", async (req, res) => {
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
