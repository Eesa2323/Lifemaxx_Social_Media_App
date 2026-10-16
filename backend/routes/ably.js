const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")

router.get("/token", auth, async (req, res) => {
    const ablyRest = req.app.get("ablyRest")
    try {
        const tokenRequest = await ablyRest.auth.createTokenRequest({
            clientId: req.user._id,
        })
        console.log("Connected: " + tokenRequest.clientId)
        res.send(tokenRequest)
    } catch (err) {
        console.error("Ably token request error:", err)
        res.status(500).send({ error: "Failed to generate Ably token" })
    }
})

module.exports = router
