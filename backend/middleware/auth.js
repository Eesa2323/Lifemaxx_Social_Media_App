const jwt = require("jsonwebtoken")
const config = require("config")
const mongoose = require("mongoose")

module.exports = function (req, res, next) {
    const accessToken = req.header("x-auth-token")
    if (!accessToken) return res.status(401).send("Unauthorized")

    try {
        const decoded = jwt.verify(accessToken, config.get("ACCESS_PRIVATE_KEY"))

        // Validate that the decoded token contains a valid user ID
        if (!decoded._id || !mongoose.Types.ObjectId.isValid(decoded._id)) {
            return res.status(401).json({ message: "Invalid token: user ID is not valid" })
        }

        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).send("Unauthorized")
    }
}
