const express = require("express");
const router = express.Router();
const { Answer, Question, TeamMember, Event } = require("../app/models");

router.post("/", async (req, res) => {
  const { teamId, questionId, answer, answerIndex } = req.body;

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
            attributes: ["id", "answer", "isCorrect"],
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
      const { teamId, firstName, lastName, email } = teamMember;
      if (!teams[teamId]) {
        teams[teamId] = {
          teamId,
          members: [],
          correctAnswers: 0,
        };
      }
      teams[teamId].members.push({
        firstName,
        lastName,
        email,
      });

      // Calculate the number of correct answers for each team
      teamMember.Answers.forEach((answer) => {
        const question = answer.Question;
        if (question.correctAnswerIndex === answer.answer) {
          teams[teamId].correctAnswers++;
        }
      });

      return teams;
    }, {});

    res.status(200).json({ teams });
  } catch (error) {
    console.error("Error retrieving teams:", error);
    res.status(500).json({ error: "Failed to retrieve teams" });
  }
});

module.exports = router;
