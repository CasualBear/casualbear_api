const { User, Team } = require("../app/models");
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
      subject: "Access Credentials",
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
    const user = await User.findOne({
      where: {
        email: req.body.email,
      },
    });

    if (!user) return res.status(400).send("Email is wrong");

    // check if password is correct
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (!validPassword) return res.status(400).send("Password is wrong");

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

    // create and assign a token
    const token = jwt.sign({ id: user.id }, "KEY_TO_SIGN_TOKEN");
    res.status(200).send({
      auth: true,
      token: token,
      role: user.role,
      team: team,
    });
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;
