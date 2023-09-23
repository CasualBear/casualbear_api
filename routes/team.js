const router = require("express").Router();
const { Team, User, Event, TeamLocation } = require("../app/models"); // Import your models
const sgMail = require("@sendgrid/mail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verify = require("./verifyToken");

/**
 * 
Create Team
This creates the users and send an email to the team captain with a username and password of his team
 */
router.post("/events/:eventId/teams", async (req, res) => {
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

  const eventId = req.params.eventId;
  const { users } = req.body;
  const ccSet = new Set();
  let hasDuplicateCC = false;

  for (const userData of users) {
    if (userData.cc) {
      if (ccSet.has(userData.cc)) {
        hasDuplicateCC = true;
        break;
      }
      ccSet.add(userData.cc);
    }
  }

  if (hasDuplicateCC) {
    return res.status(400).json({
      message: "CC's duplicados",
      details: null,
    });
  }

  try {
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const name = generateRandomNumber();

    const createdUsers = [];
    const usersFromRequest = req.body.users;
    const randomPassword = generateRandomPassword(4);

    // create users
    for (let i = 0; i < usersFromRequest.length; i++) {
      const userData = usersFromRequest[i];
      if (userData.isCaptain) {
        try {
          const salt = await bcrypt.genSaltSync(10);
          const hashedPassword = await bcrypt.hashSync(randomPassword, salt);

          // Create a new user with the hashed password
          const user = await User.create({
            ...userData,
            password: hashedPassword, // Include the hashed password in userData
          });

          createdUsers.push(user);

          // send the email if team and users are well created
          sgMail.setApiKey(
            "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"
          );

          const msg = {
            to: userData.email,
            from: "noreply@wbdday.pt",
            subject: "Credenciais de acesso - WBD'Day 2023",
            html: `<p>Caro participante,</p>
<p>Temos todo o gosto em confirmar que recebemos a inscrição da tua equipa para o Warner Bros. Discovery Day, que acontecerá no próximo dia 23 de setembro de 2023, em Lisboa.</p>
<p>A inscrição passou para a fase de validação, e entraremos em contacto assim que possível para validar ou não a vossa presença no passatempo, de acordo com os termos descritos no Regulamento.</p>
<p>Enviamos abaixo os dados de login para a aplicação do jogo, que estará disponível mais perto da data do Passatempo. Através do website <a href="www.wbdday.pt">www.wbdday.pt</a> poderás aceder diretamente à App Store ou à Play Store, onde poderás descarregar a aplicação de forma gratuita.</p>
<p><strong>DADOS DE LOGIN</strong></p>
<p>Email: ${userData.email}</p>
<p>Password: ${randomPassword}</p>
<p>Caso tenhas alguma dúvida ou questão, envia-nos um email para <a href="mailto:info@wbdday.pt">info@wbdday.pt</a>.</p>
<p>Cumprimentos,<br>Organização do WBD’Day 2023.</p>
<img src="https://casualbearapi-staging.s3.amazonaws.com/Screenshot+2023-09-01+at+16.50.11.png" alt="Signature Image" width="671" height="314">`,
          };

          sgMail
            .send(msg)
            .then(() => {
              console.log("Email sent");
            })
            .catch((error) => {
              console.error(error);
            });
        } catch (error) {
          console.error(error);
          if (error.name === "SequelizeUniqueConstraintError") {
            // Handle unique constraint violation (duplicate email or cc)
            return res
              .status(400)
              .json({ message: "Email or cc already exists" });
          }
          return res.status(400).json({ message: "Error creating user" });
        }
      } else {
        try {
          const user = await User.create(userData);
          createdUsers.push(user);
        } catch (error) {
          console.error(error);
          if (error.name === "SequelizeUniqueConstraintError") {
            // Handle unique constraint violation (duplicate email or cc)
            return res
              .status(400)
              .json({ message: "Email or cc already exists" });
          }
          return res.status(400).json({ message: "Error creating user" });
        }
      }
    }

    // if everything is ok with the users creation, create the team
    const team = await Team.create({
      name,
      eventId,
      zones: zonesAsString,
      isVerified: "Validating",
      isCheckedOverall: true,
    });

    team.setMembers(createdUsers);

    res.status(201).json({ team, members: createdUsers });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      // Handle unique constraint violation (duplicate email or cc)
      return res.status(400).json({ message: "Email or cc already exists" });
    } else {
      // Handle other errors
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
});

/**
 * Update exinting team members
 */
router.put("/users/:userId", async (req, res) => {
  const userId = req.params.userId;
  const updatedUserData = req.body;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user data
    await user.update(updatedUserData);

    return res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Add user to the team
 */
router.post("/:teamId/add-users", async (req, res) => {
  const teamId = req.params.teamId;
  const userData = req.body; // A single user object to add to the team

  try {
    const team = await Team.findByPk(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Create a new user based on the provided userData
    const user = await User.create(userData);

    // Add the user to the team
    await team.addMember(user);

    return res
      .status(200)
      .json({ message: "User added to the team successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Delete user from team
 */

router.delete("/:teamId/users/:userId", async (req, res) => {
  const teamId = req.params.teamId;
  const userId = req.params.userId;

  try {
    const team = await Team.findByPk(teamId);
    const user = await User.findByPk(userId);

    if (!team || !user) {
      return res.status(404).json({ message: "Team or user not found" });
    }

    // Remove the user from the team
    await team.removeMember(user);

    // Delete the user from the database
    await user.destroy();

    return res.status(200).json({
      message:
        "User removed from the team and deleted from the database successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Get Teams inside an Event
 */

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

/**
 * Update user's isVerified and isCheckedIn
 */
router.put("/team-flags", verify, async (req, res) => {
  const teamUpdates = req.body;
  const { teamSockets } = req;

  try {
    for (const update of teamUpdates) {
      const { teamId, isVerified, isCheckedIn } = update;
      const team = await Team.findByPk(teamId);

      if (!team) {
        return res
          .status(404)
          .json({ message: `Team with ID ${teamId} not found` });
      }

      // Assuming `verificationStatus` can be "Validating", "Approved", or "Denied"
      if (
        isVerified === "Validating" ||
        isVerified === "Approved" ||
        isVerified === "Denied"
      ) {
        team.isVerified = isVerified;
      } else {
        return res.status(400).json({
          message: `Invalid verification status: ${isVerified}`,
        });
      }

      team.isCheckedIn = isCheckedIn;
      await team.save();

      // Use teamSockets as needed
      const teamSocket = teamSockets[teamId];
      if (teamSocket) {
        teamSocket.emit(
          "TeamUpdated",
          JSON.stringify({
            isCheckedIn: team.isCheckedIn,
            isVerified: team.isVerified,
          })
        );
      }
    }

    return res.status(200).json({ message: "Team updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Set Team location
 */
router.post("/teams/:teamId/location", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { latitude, longitude } = req.body;

    // Use Sequelize to create a new TeamLocation record
    const newLocation = await TeamLocation.create({
      teamId,
      latitude,
      longitude,
    });

    res.status(201).json(newLocation);
  } catch (error) {
    console.error("Error creating team location:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

/**
 * Get Team Location
 */
router.get("/teams/:teamId/location", async (req, res) => {
  try {
    const { teamId } = req.params;

    // Use Sequelize to find the location data for the specified teamId
    const locationData = await TeamLocation.findAll({
      where: { teamId },
    });

    if (!locationData) {
      return res.status(404).json({ message: "Team location not found" });
    }

    res.status(200).json(locationData);
  } catch (error) {
    console.error("Error fetching team location:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * PUT update zones status by team ID
 */
router.put("/teams/:teamId/zones", verify, async (req, res) => {
  const teamId = req.params.teamId;
  const { zones } = req.body;
  const { teamSockets } = req;

  try {
    const team = await Team.findByPk(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Convert the zones array to a JSON string
    const zonesAsString = JSON.stringify(zones);

    // Update the zones status for the team
    await team.update({ zones: zonesAsString });
    const teamSocket = teamSockets[teamId];
    if (teamSocket) {
      teamSocket.emit("ZonesChanged");
    }

    res.json({ message: "Zones status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Get team details
 */

router.get("/event/:eventId/teams/:teamId", verify, async (req, res) => {
  const teamId = req.params.teamId;
  const eventId = req.params.eventId;

  try {
    // Find the team by its ID and include team members
    const team = await Team.findByPk(teamId, {
      include: [
        {
          model: User,
          as: "members", // Assuming you have an alias 'members' in your Team model
        },
      ],
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const event = await Event.findOne({
      where: {
        id: eventId,
      },
    });

    // Retrieve the team details along with its members
    res.json({
      team,
      hasStarted: event.hasStarted,
      eventInitHour: event.eventInitHour,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
/**
 * DELETE team by ID with cascade delete of users
 */
router.delete("/teams/:teamId", async (req, res) => {
  const teamId = req.params.teamId;

  try {
    const team = await Team.findByPk(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Delete the members of the team
    await deleteTeamMembers(team);

    // Now, delete the team itself
    await team.destroy();

    res.json({ message: "Team and its members deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

async function deleteTeamMembers(team) {
  try {
    const members = await User.findAll({ where: { teamId: team.id } });

    // Iterate through the team's members and delete them
    for (const member of members) {
      await member.destroy();
      console.log(`Deleted user ${member.name}`);
    }

    console.log(`Deleted all members of team ${team.name}`);
  } catch (error) {
    console.error(error);
  }
}

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

function generateRandomNumber() {
  return Math.floor(10000 + Math.random() * 90000);
}

module.exports = router;
