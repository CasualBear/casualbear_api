const jwt = require("jsonwebtoken");
const { User } = require("../app/models"); // Import your User model here

module.exports = async function (req, res, next) {
  const token = req.header("Authorization");
  const admin = req.header("ADMIN");

  if (admin == "true") {
    // If the user is an admin, allow access and return
    return next();
  }

  if (!token) {
    return res.status(401).send("Access Denied");
  }

  try {
    const verified = jwt.verify(token, "SECRET_TOKEN_HASH");
    req.user = verified;
    var decoded = jwt.decode(token);
    req.userId = decoded.id;
    req.deviceIdentifier = decoded.deviceIdentifier;

    // Check if the deviceIdentifier from JWT belongs to the user
    const user = await User.findOne({
      where: { id: req.userId, deviceIdentifier: req.deviceIdentifier },
    });

    if (!user) {
      return res.status(401).send("Authorization Invalid");
    }

    // If all checks pass, allow access
    next();
  } catch (error) {
    res.status(400).send("Invalid Token");
  }
};
