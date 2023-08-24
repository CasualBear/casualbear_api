const router = require("express").Router();
const { Team, User, Event } = require("../app/models"); // Import your models
const sgMail = require("@sendgrid/mail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// create Team
// This creates the users and send an email to the team captain with a username and password of his team
router.post("/events/:eventId/teams", async (req, res) => {
  const predefinedZones = [
    { name: "ZoneA", active: false },
    { name: "ZoneB", active: false },
    { name: "ZoneC", active: false },
    { name: "ZoneD", active: false },
    { name: "ZoneE", active: false },
  ];

  const zonesAsString = JSON.stringify(predefinedZones);

  const eventId = req.params.eventId;
  const { name, users } = req.body;

  try {
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const team = await Team.create({ name, eventId, zones: zonesAsString });

    req.body.teamId = team.id;
    const createdUsers = [];
    const usersFromRequest = req.body.users[0];

    for (let i = 0; i < usersFromRequest.length; i++) {
      const userData = usersFromRequest[i];
      if (userData.isCaptain) {
        try {
          sgMail.setApiKey(
            "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"
          );

          const randomPassword = generateRandomPassword(4);

          const msg = {
            to: userData.email,
            from: "nobre@casualbear.io",
            subject: "Access Credentials",
            text:
              "Welcome. These are your credentials. Email: " +
              userData.email +
              " and Password: " +
              randomPassword,
          };

          sgMail
            .send(msg)
            .then(() => {
              console.log("Email sent");
            })
            .catch((error) => {
              console.error(error);
            });

          const salt = await bcrypt.genSaltSync(10);
          const hashedPassword = await bcrypt.hashSync(randomPassword, salt);

          // Create a new user with the hashed password
          const user = await User.create({
            ...userData,
            password: hashedPassword, // Include the hashed password in userData
          });

          createdUsers.push(user);
        } catch (error) {
          res.status(400).send(error);
        }
      } else {
        const user = await User.create(userData);
        createdUsers.push(user);
      }
    }

    team.setMembers(createdUsers);

    res.status(201).json({ team, members: createdUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/events/:eventId/teams", async (req, res) => {
  const eventId = req.params.eventId;

  try {
    // Check if the event exists
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Fetch teams associated with the event
    const teams = await Team.findAll({
      where: { eventId }, // Fetch teams where eventId matches
      include: "members", // Include associated users/members
    });

    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update zones status by team ID
router.put("/teams/:teamId/zones", async (req, res) => {
  const teamId = req.params.teamId;
  const { zones } = req.body;

  try {
    const team = await Team.findByPk(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Convert the zones array to a JSON string
    const zonesAsString = JSON.stringify(zones);

    // Update the zones status for the team
    await team.update({ zones: zonesAsString });

    res.json({ message: "Zones status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE team by ID with cascade delete of users
router.delete("/teams/:teamId", async (req, res) => {
  const teamId = req.params.teamId;

  try {
    const team = await Team.findByPk(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Delete the team with cascade deletion of associated users
    await team.destroy({ cascade: true });

    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

function generateRandomPassword(length) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

module.exports = router;