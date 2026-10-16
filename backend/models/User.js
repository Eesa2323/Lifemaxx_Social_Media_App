const mongoose = require("mongoose")
const config = require("config")
const jwt = require("jsonwebtoken")
const { v4: uuidV4 } = require("uuid")

const MAX_FOLLOWERS = 7000

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        minLength: 4,
        maxLength: 30,
    },
    email: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 255,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minLength: 6,
        maxLength: 1000,
    },
    tokenVersion: {
        type: Number,
        required: true,
        default: 0,
    },
    privacyStatus: {
        type: Boolean,
        required: true,
        default: false,
    },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    recentSearchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    recentUserSearchers: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        validate: {
            validator: function (arr) {
                return arr.length <= 50
            },
            message: "Recent user searchers cannot exceed 50 items",
        },
    },
    lastReadNotificationTime: { type: Date, default: new Date() },
    profilePic: { type: String, default: "" },
    bio: { type: String, min: 1, max: 250 },
    location: { type: String, min: 1, max: 300 },
    interests: {
        type: [String],
        // ADD BACK LATER

        // validate: {
        //     validator: function (arr) {
        //         const allowed = ["Fitness", "Money", "Self-Improvement", "Looksmaxxing"]
        //         if (!Array.isArray(arr) || arr.length < 1 || arr.length > 5) return false
        //         return arr.every((cat) => allowed.includes(cat))
        //     },
        //     message: "Interests must be 1-5 valid categories.",
        // },
        required: true,
    },
    completedJourneys: { type: Number, default: 0 },
})

const userTokenSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        token: { type: String, required: true },
        tokenExpiry: { type: Date, required: true },
        type: { type: String, required: true },
        payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: false }
)

const blocksSchema = new mongoose.Schema(
    {
        blocker: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        blocked: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
)

userSchema.methods.generateAccessToken = function () {
    const token = jwt.sign(
        {
            _id: this._id,
            username: this.username,
            uid: uuidV4(),
        },
        config.get("ACCESS_PRIVATE_KEY"),
        { expiresIn: "90m" }
    )

    return token
}

userSchema.methods.generateRefreshToken = function () {
    const token = jwt.sign(
        { _id: this._id, tokenVersion: this.tokenVersion },
        config.get("REFRESH_PRIVATE_KEY"),
        { expiresIn: 7 * 24 * 60 * 60 * 1000 }
    )
    return token
}

const User = mongoose.model("User", userSchema)
const UserTokens = mongoose.model("UserTokens", userTokenSchema)
const Blocks = mongoose.model("Blocks", blocksSchema)

module.exports = {
    User,
    UserTokens,
    Blocks,
    MAX_FOLLOWERS,
}
