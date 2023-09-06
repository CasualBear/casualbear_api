const { RevokedToken } = require("../app/models"); // Import your models

const jwt = require("jsonwebtoken");

// Function to revoke a token
async function revokeToken(tokenToRevoke) {
  await RevokedToken.create({
    token: tokenToRevoke,
  });
}

// Middleware for generating and checking tokens
module.exports = async function (req, res, next) {
  const token = req.header("Authorization");
  const isAdmin = req.header("Admin");

  if (isAdmin == "true") {
    next();
    return;
  }

  if (!token) return res.status(401).send("Access Denied");

  try {
    // Check if the incoming token is revoked by querying the database
    const isRevoked = await RevokedToken.findOne({
      where: { token: token },
    });

    if (isRevoked) {
      return res.status(401).send("Token Revoked");
    }

    const verified = jwt.verify(token, "WBBDAYTOKEN_SECRET_HASH");
    req.user = verified;
    var decoded = jwt.decode(token);
    req.userId = decoded.id;

    // Check if the token has expired
    if (Date.now() >= decoded.exp * 1000) {
      return res.status(401).send("Token Expired");
    }

    // Generate a new token (e.g., when refreshing)
    const newToken = jwt.sign({ id: req.userId }, "WBBDAYTOKEN_SECRET_HASH", {
      expiresIn: "1h",
    });

    // Revoke the previous token and save it to the database
    await revokeToken(token);

    // Send the new token as a response or store it as needed
    res.setHeader("Authorization", newToken);
    next();
  } catch (error) {
    res.status(400).send("Invalid Token");
  }
};
