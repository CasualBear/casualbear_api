const { User, Team, RevokedToken } = require("../app/models");
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");

router.post("/register", async (req, res) => {
  // execute Query
  try {
    sgMail.setApiKey(
      "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"
    );

    const msg = {
      to: req.body.email,
      from: "noreply@wbday.pt",
      subject: "Credenciais de acesso - WBD'Day 2023",
      text:
        "Welcome. This are your credentials. Email: " +
        req.body.email +
        " and Password: " +
        req.body.password,
    };

    sgMail
      .send(msg)
      .then(() => {
        console.log("Email sent");
      })
      .catch((error) => {
        console.error(error);
      });

    // hash the password
    const salt = await bcrypt.genSaltSync(10);
    const hashedPassword = await bcrypt.hashSync(req.body.password, salt);
    req.body.password = hashedPassword;

    const user = await User.create(req.body);

    res.json(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { email, password, deviceIdentifier } = req.body;

    // Find the user by their email
    const user = await User.findOne({
      where: { email: email },
    });

    if (!user) {
      return res.status(401).json({ message: "Email is wrong" });
    }

    // Check if the provided password matches the stored hash
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Password is wrong" });
    }

    // Find the team of the user and all members
    const team = await Team.findOne({
      where: {
        id: user.teamId,
      },
      include: [
        {
          model: User,
          as: "members",
        },
      ],
    });

    // Store the device identifier associated with the user
    await User.update(
      { deviceIdentifier: deviceIdentifier },
      {
        where: { id: user.id },
      }
    );

    // Create a new token for the user
    const token = jwt.sign(
      { id: user.id, deviceIdentifier: deviceIdentifier },
      "SECRET_TOKEN_HASH",
      {
        expiresIn: "10000h", // Set your desired token expiration
      }
    );

    res.status(200).json({
      auth: true,
      role: user.role,
      token: token,
      team: team,
      message: "Login successful",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
