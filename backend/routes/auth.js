const express = require("express")
const bcrypt = require("bcrypt")
const { validateUserSignup, validateUserLogin } = require("../middleware/validation")
const router = express.Router()
const jwt = require("jsonwebtoken")
const config = require("config")
const { User, UserChats, Blocks } = require("../models/User")
const { delay } = require("../utils/helper")
const auth = require("../middleware/auth")
const fileUpload = require("express-fileupload")
const { uploadToLocal } = require("../utils/upload")
const { v4: uuidv4 } = require("uuid")
const path = require("path")

const JWT_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth/refresh_token",
}

router.post(
    "/signup",
    fileUpload({ limits: { files: 1, fileSize: 1024 * 1024 * 20 }, abortOnLimit: true }),
    async (req, res) => {
        const body = req.body
        const file = req.files && req.files.profilePic
        const { error } = validateUserSignup(body)
        if (error) return res.status(400).send(error.details[0].message)

        let user = await User.findOne({ username: body.username })
        if (user) return res.status(400).send("Username is already taken")

        user = await User.findOne({ email: body.email })
        if (user) return res.status(400).send("Email address is not available")

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(body.password, salt)

        let profilePicUrl = ""
        if (file) {
            try {
                const fileName = `${uuidv4()}${path.extname(file.name)}`
                const filePath = path.join(__dirname, "../uploads/profilePics/", fileName)
                await file.mv(filePath)
                profilePicUrl = fileName
            } catch (err) {
                return res.status(400).send("Failed to upload profile picture")
            }
        }

        user = new User({
            username: body.username,
            email: body.email,
            password: hashedPassword,
            bio: body.bio || "",
            location: body.location || "",
            profilePic: profilePicUrl,
            interests: Array.isArray(body.interests)
                ? body.interests
                : body.interests
                ? [body.interests]
                : [],
        })
        await user.save()

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        res.cookie("jwt", refreshToken, JWT_COOKIE_OPTIONS)
        return res.header("x-auth-token", accessToken).send({
            username: user.username,
            _id: user._id,
            bio: user.bio,
            profilePic: user.profilePic,
            privacyStatus: user.privacyStatus,
            followers: user.followerCount,
            following: user.followingCount,
            interests: user.interests,
        })
    }
)

router.post("/login", async (req, res) => {
    const { error } = validateUserLogin(req.body)
    if (error) return res.status(400).send(error.details[0].message)
    const identifier = req.body.usernameOrEmail

    const user = await User.findOne({
        $or: [{ username: identifier }, { email: identifier }],
    })

    if (!user) return res.status(400).send("Username/email or password is incorrect")

    const validPassword = await bcrypt.compare(req.body.password, user.password)
    if (!validPassword) return res.status(400).send("Username/email or password is incorrect")

    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    const data = await generateResponse(user, accessToken)

    console.log(data)

    res.cookie("jwt", refreshToken, JWT_COOKIE_OPTIONS)
    return res.header("x-auth-token", accessToken).send(data)
})

router.get("/refresh_token", async (req, res) => {
    const token = req.cookies.jwt
    if (!token) return res.status(401).send("Access denied")

    let payload = null

    try {
        payload = jwt.verify(token, config.get("REFRESH_PRIVATE_KEY"))
    } catch (err) {
        return res.status(401).send("Invalid token")
    }

    const user = await User.findOne({ _id: payload._id })
    if (!user) return res.status(401).send("Invalid token")
    if (user.tokenVersion !== payload.tokenVersion) return res.status(401).send("Not authorized")

    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    const data = await generateResponse(user, accessToken)

    res.cookie("jwt", refreshToken, JWT_COOKIE_OPTIONS)
    res.send(data)
})

router.post("/logout", auth, async (req, res) => {
    res.clearCookie("jwt", {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        path: "/api/auth/refresh_token",
    })

    res.send({ message: "Logged out successfully" })
})

router.post("/check-availability", async (req, res) => {
    const { username, email } = req.body
    if (!username && !email) return res.status(400).send({ error: "Username or email required" })
    if (username) {
        const user = await User.findOne({ username })
        if (user) return res.status(400).send({ error: "Username is already taken" })
    }
    if (email) {
        const user = await User.findOne({ email })
        if (user) return res.status(400).send({ error: "Email address is not available" })
    }
    return res.send({ ok: true })
})

async function generateResponse(user, token) {
    const blocks = await Blocks.find({ blocker: user._id }).select("blocked -_id")

    return {
        token,
        userData: {
            _id: user._id,
            username: user.username,
            profilePic: user.profilePic,
            lastReadNotificationTime: user.lastReadNotificationTime,
            blocked: blocks?.map((b) => b.blocked),
        },
    }
}

module.exports = router
