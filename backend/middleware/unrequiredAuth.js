const jwt = require("jsonwebtoken")
const config = require("config")

module.exports = function (req, res, next) {
    const accessToken = req.header("x-auth-token")

    try {
        if (!accessToken) throw new Error("Unauthorized")

        const decoded = jwt.verify(accessToken, config.get("ACCESS_PRIVATE_KEY"))
        req.user = decoded
        next()
    } catch (err) {
        next()
    }
}
