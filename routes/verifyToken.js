const jwt = require('jsonwebtoken')

module.exports = function (req, res, next) {
    const token = req.header('Authorization')
    if (!token) return res.status(401).send("Access Denied")

    try {
        tokenFormatted = token.slice(7, token.length).replace(/['"]+/g, '').replace(/\s/g, '');
        const verified = jwt.verify(tokenFormatted, process.env.TOKEN_SECRET)
        req.user = verified;
        var decoded = jwt.decode(tokenFormatted);
        req.userId = decoded.id
        next()
    } catch (error) {
        res.status(400).send("Invalid Token")
    }
}
