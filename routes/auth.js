const { User, Team } = require("../app/models");
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");

router.post("/register", async (req, res) => {
  // execute Query
  try {
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
      { id: user.id, email: user.email, deviceIdentifier: deviceIdentifier },
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

router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Find the user by their email
    const user = await User.findOne({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a new random password
    const newPassword = generateRandomPassword();

    // Hash the new password
    const salt = await bcrypt.genSaltSync(10);
    const hashedPassword = await bcrypt.hashSync(newPassword, salt);

    // Update the user's password in the database
    await User.update(
      { password: hashedPassword },
      {
        where: { id: user.id },
      }
    );

    // Send the new password to the user's email
    // send the email if team and users are well created
    sgMail.setApiKey(
      "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"
    );

    const msg = {
      to: email,
      from: "noreply@wbdday.pt",
      subject: "Credenciais de acesso - WBD'Day 2023",
      html: `<p>Caro participante,</p>
<p>Enviamos abaixo os novos dados de login para a aplicação do jogo, que estará disponível mais perto da data do Passatempo. Através do website <a href="www.wbdday.pt">www.wbdday.pt</a> poderás aceder diretamente à App Store ou à Play Store, onde poderás descarregar a aplicação de forma gratuita.</p>
<p><strong>DADOS DE LOGIN</strong></p>
<p>Email: ${email}</p>
<p>Password: ${newPassword}</p>
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

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

function generateRandomPassword() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let newPassword = "";

  for (let i = 0; i < 4; i++) {
    const randomIndex = crypto.randomInt(characters.length);
    newPassword += characters.charAt(randomIndex);
  }

  return newPassword;
}

module.exports = router;
