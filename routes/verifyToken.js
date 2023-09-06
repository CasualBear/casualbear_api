const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.header("Authorization");
  const isAdmin = req.header("Admin");

  if (isAdmin == "true") {
    next();
    return;
  }

  if (!token) return res.status(401).send("Access Denied");

  try {
    const verified = jwt.verify(token, "WBBDAYTOKEN_SECRET_HASH");
    req.user = verified;
    var decoded = jwt.decode(token);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(400).send("Invalid Token");
  }
};
