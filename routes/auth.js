const { User } = require("../app/models");
const router = require("express").Router();
const { registerValidation, loginValidation } = require("../validation");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

router.post("/register", async (req, res) => {
  // execute Query
  try {
    // Create a transporter object with your email service provider details
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "nobre@casualbear.io",
        pass: "Lol08lol!!",
      },
    });

    // Define the email content
    const mailOptions = {
      from: "nobre@casualbear.io",
      to: req.body.email,
      subject: "Test Email",
      text:
        "Welcome. This are your credentials. Email: " +
        req.body.email +
        " and Password: " +
        req.body.password,
    };

    // Send the email
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
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
  // validation
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const user = await User.findAll({
      where: {
        email: req.body.email,
      },
    });

    if (user.length === 0) return res.status(400).send("Email is wrong");

    // check if password is correct
    const validPassword = await bcrypt.compare(
      req.body.password,
      user[0].password
    );

    if (!validPassword) return res.status(400).send("Password is wrong");

    // create and assign a token
    const token = jwt.sign({ id: user[0].id }, "KEY_TO_SIGN_TOKEN");
    res.status(200).send({ auth: true, token: token, role: user[0].role });
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;
