const express = require("express");
const router = express.Router();
const { Answer, Question, TeamMember, Event } = require("../app/models");

router.post("/", async (req, res) => {
  const { teamId, questionId, answer, answerIndex, timeInSeconds } = req.body;

  try {
    const question = await Question.findByPk(questionId);
    const teamMembers = await TeamMember.findAll({
      where: {
        teamId: teamId,
      },
    });

    if (!question || !teamMembers.length) {
      return res.status(404).json({ error: "Question or team not found" });
    }

    let isAnyAnswerCorrect = false;

    for (const teamMember of teamMembers) {
      const existingAnswer = await Answer.findOne({
        where: {
          teamMemberId: teamMember.id,
          questionId: questionId,
        },
      });

      if (existingAnswer) {
        // Team has already answered this question
        return res.status(400).json({ error: "Question already answered" });
      }

      const isCorrect = question.correctAnswerIndex === (answer || answerIndex);

      await Answer.create({
        answer: answer || answerIndex,
        questionId,
        teamMemberId: teamMember.id,
        isCorrect,
        time: timeInSeconds,
      });

      if (isCorrect) {
        isAnyAnswerCorrect = true;
        teamMember.points = (teamMember.points || 0) + 1;
        await teamMember.save();
      }
    }

    if (isAnyAnswerCorrect) {
      res.status(200).json({ message: "Answer is correct" });
    } else {
      res.status(200).json({ message: "Answer is incorrect" });
    }
  } catch (error) {
    console.error("Error creating answer:", error);
    res.status(500).json({ error: "Failed to create answer" });
  }
});

router.get("/teams/event/:eventId", async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const event = await Event.findByPk(eventId, {
      include: {
        model: TeamMember,
        as: "TeamMembers",
        include: [
          {
            model: Answer,
            attributes: ["id", "answer", "isCorrect", "time"], // Include the "time" attribute
            include: {
              model: Question,
              attributes: ["id", "correctAnswerIndex"],
            },
          },
          {
            model: Event,
            attributes: [],
            where: { id: eventId },
          },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const teams = event.TeamMembers.reduce((teams, teamMember) => {
      const { teamId } = teamMember;
      if (!teams[teamId]) {
        teams[teamId] = {
          teamId,
          correctAnswers: 0,
          totalTime: 0, // Initialize the total time as 0
          answerCount: 0, // Initialize the answer count as 0
        };
      }

      // Calculate the number of correct answers for each team
      teamMember.Answers.forEach((answer) => {
        const question = answer.Question;
        if (answer.isCorrect) {
          teams[teamId].correctAnswers++;
        }
      });

      // Accumulate the total time and count the answers for each team
      teamMember.Answers.forEach((answer) => {
        teams[teamId].totalTime += answer.time;
        teams[teamId].answerCount++;
      });

      return teams;
    }, {});

    // Calculate the average time for each team and format the response
    const formattedTeams = Object.values(teams).map((team) => ({
      teamId: team.teamId,
      averageTime: team.answerCount > 0 ? team.totalTime / team.answerCount : 0,
      correctAnswers: team.correctAnswers,
    }));

    res.status(200).json({ teams: formattedTeams });
  } catch (error) {
    console.error("Error retrieving teams:", error);
    res.status(500).json({ error: "Failed to retrieve teams" });
  }
});

module.exports = router;
