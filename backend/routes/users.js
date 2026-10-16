const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const mongoose = require("mongoose")
const { User, Blocks, UserTokens } = require("../models/User")
const { Follow, Request } = require("../models/Follow")
const { Notification } = require("../models/Notification")
const {
    getFollowAndRequestFieldsStages,
    getBlockExclusionStages,
    checkBlockExistance,
    getStoryLookupStage,
} = require("../utils/helper")
const fileUpload = require("express-fileupload")
const { v4: uuidv4 } = require("uuid")
const path = require("path")
const {
    validateUpdateUserDetails,
    validateEmail,
    validatePasswordChange,
} = require("../middleware/validation")
const unrequiredAuth = require("../middleware/unrequiredAuth")
const bcrypt = require("bcrypt")
const transporter = require("../utils/nodemailerConfig")
const config = require("config")
const { delay } = require("../utils/helper")

const USER_PROFILE_PIC_UPLOAD_CONFIG = {
    limits: { files: 1, fileSize: 1024 * 1024 * 10 },
    abortOnLimit: true,
}

router.get("/search/:query", [unrequiredAuth], async (req, res) => {
    const { query } = req.params
    const userId = req.user ? new mongoose.Types.ObjectId(req.user._id) : null
    console.log(userId)

    if (!query) return res.status(400).send("No query provided")

    const project = getUserProjectStage()
    const blockStage = await getBlockExclusionStages(userId, "_id")
    const storyLookupStage = userId ? getStoryLookupStage(userId, "$_id") : []

    const followAndRequestFieldsStages = userId
        ? getFollowAndRequestFieldsStages(userId, "$_id")
        : []
    const pipeline = [
        {
            $match: {
                $and: [
                    ...(userId ? [{ _id: { $ne: userId } }] : []),
                    { username: { $regex: new RegExp(query, "i") } },
                ],
            },
        },
        ...blockStage,
        ...followAndRequestFieldsStages,
        ...storyLookupStage,
        { $limit: 20 },
        ...project,
    ]

    const users = await User.aggregate(pipeline)
    res.send(users)
})

router.get("/accountinfo/:username", [unrequiredAuth], async (req, res) => {
    const { username } = req.params
    if (!username) return res.status(400).send("Cannot fetch account information")

    console.log("Called: " + username)

    const userId = req.user ? new mongoose.Types.ObjectId(req.user._id) : null
    const userProjectStage = getUserProjectStage()
    const storyLookupStage = userId ? getStoryLookupStage(userId, "$_id") : []
    const followStage = userId ? getFollowAndRequestFieldsStages(userId, "$_id") : []
    const blockStage = await getBlockExclusionStages(userId, "_id")
    const userInfo = await User.aggregate([
        { $match: { username } },
        ...blockStage,
        ...storyLookupStage,
        ...followStage,
        ...userProjectStage,
    ])

    const response = userInfo[0]
    if (!response) return res.status(400).send("Could not find user profile")

    res.send(response)
})

router.put("/follow/:userid", [auth], async (req, res) => {
    const userId = req.user._id
    const targetUserId = req.params.userid
    const type = req.body.type

    if (!targetUserId || userId === targetUserId) return res.status(400).send("Cannot follow user")
    else if (type !== "follow" && type !== "unfollow")
        return res.status(400).send("Invalid follow type")

    const blockExists = await checkBlockExistance(userId, targetUserId)
    if (blockExists) return res.status(400).send("Cannot follow user")

    const followFunction = type === "follow" ? handleFollow : handleUnfollow
    const result = await followFunction(userId, targetUserId)
    if (result["error"]) return res.status(400).send(result)

    res.send(result)
})

router.post("/confirm-email-change", [auth], async (req, res) => {
    const userId = req.user._id
    const { token } = req.body

    await delay(6000)

    if (!token) return res.status(400).send("No token provided")

    try {
        const payload = await verifyUserToken({ _id: userId }, "CHANGE_EMAIL", token, true)
        if (!payload || !payload.email)
            return res.status(400).send("Could not confirm email address")

        const existing = await User.exists({ email: payload.email })
        if (existing) return res.status(400).send("Email already in use")

        await User.updateOne({ _id: userId }, { email: payload.email })

        res.send({ email: payload.email })
    } catch (err) {
        const message = err?.message || "Something failed, please try again later."
        return res.status(400).send(message)
    }
})

router.put(
    "/update_profile_details",
    [auth, fileUpload(USER_PROFILE_PIC_UPLOAD_CONFIG), validateUpdateUserDetails],
    async (req, res) => {
        const userId = req.user._id
        const updatedPayload = req.updatePayload
        const updatedProfilePic = req.files && req.files.file

        console.log(updatedPayload)

        if (updatedProfilePic) {
            const fileName = `${uuidv4()}${path.extname(updatedProfilePic.name)}`
            const filePath = path.join(__dirname, "../uploads/profilePics/", fileName)

            await updatedProfilePic.mv(filePath)
            updatedPayload["profilePic"] = fileName
        }

        if (updatedPayload.username) {
            const existingUser = await User.findOne({
                username: updatedPayload.username,
                _id: { $ne: userId },
            })
            if (existingUser) return res.status(400).send("Username has already been taken")
        }

        // Validate interests if provided
        if (updatedPayload.interests) {
            console.log(updatedPayload.interests)

            if (!Array.isArray(updatedPayload.interests)) {
                return res.status(400).send("Interests must be an array")
            }
            if (updatedPayload.interests.length > 5) {
                return res.status(400).send("Maximum 5 interests allowed")
            }
            const validInterests = ["Fitness", "Money", "Self-Improvement", "Looksmaxxing"]
            if (!updatedPayload.interests.every((i) => validInterests.includes(i))) {
                return res.status(400).send("Invalid interest category")
            }
        }

        const user = await User.findOneAndUpdate(
            { _id: userId },
            { $set: updatedPayload },
            { new: true }
        )
        if (!user) return res.status(400).send("Could not find authenticated user")

        res.send({ updatedPayload })
    }
)

router.post("/block/:userid", [auth], async (req, res) => {
    const userId = req.user._id
    const targetUserId = req.params.userid
    if (!targetUserId || userId === targetUserId) return res.status(400).send("Cannot block user")

    const blockCount = await Blocks.countDocuments({ blocker: userId })
    if (blockCount >= 200) return res.status(400).send("Cannot block more than 200 users")

    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {
            const result = await Blocks.updateOne(
                { blocker: userId, blocked: targetUserId },
                { $setOnInsert: { blocker: userId, blocked: targetUserId } },
                { upsert: true, session }
            )

            await User.updateMany(
                { _id: userId },
                { $pull: { recentUserSearchers: targetUserId } },
                { session }
            )
            await User.updateMany(
                { _id: targetUserId },
                { $pull: { recentUserSearchers: userId } },
                { session }
            )

            if (result.upsertedCount !== 1) throw new Error("Already blocked user")

            const follow1 = await Follow.deleteOne(
                { follower: targetUserId, following: userId },
                { session }
            )
            const follow2 = await Follow.deleteOne(
                { follower: userId, following: targetUserId },
                { session }
            )

            let ops = []
            if (follow1.deletedCount) {
                ops.push({
                    updateOne: {
                        filter: { _id: targetUserId },
                        update: { $inc: { followingCount: -1 } },
                    },
                })
                ops.push({
                    updateOne: {
                        filter: { _id: userId },
                        update: { $inc: { followerCount: -1 } },
                    },
                })
            }

            if (follow2.deletedCount) {
                ops.push({
                    updateOne: {
                        filter: { _id: userId },
                        update: { $inc: { followingCount: -1 } },
                    },
                })
                ops.push({
                    updateOne: {
                        filter: { _id: targetUserId },
                        update: { $inc: { followerCount: -1 } },
                    },
                })
            }

            if (ops.length) await User.bulkWrite(ops, { session })
        })

        return res.send("Blocked")
    } catch (err) {
        console.log(err)

        return res.status(400).send("Could not block user")
    } finally {
        await session.endSession()
    }
})

router.delete("/unblock/:userid", [auth], async (req, res) => {
    const userId = req.user._id
    const targetUserId = req.params.userid
    if (!targetUserId || userId === targetUserId) return res.status(400).send("Cannot block user")

    await Blocks.deleteOne({ blocker: userId, blocked: targetUserId })
    res.send("Unblocked")
})

router.get("/blocked", [auth], async (req, res) => {
    const userId = req.user._id
    const { cursor } = req.query
    const limit = 20

    try {
        const matchStage = {
            blocker: new mongoose.Types.ObjectId(userId),
        }

        if (cursor) {
            matchStage.createdAt = { $lt: new Date(cursor) }
        }

        const pipeline = [
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
            { $limit: limit + 1 },
            {
                $lookup: {
                    from: "users",
                    localField: "blocked",
                    foreignField: "_id",
                    as: "blockedUser",
                },
            },
            { $unwind: "$blockedUser" },
            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    blockedUser: {
                        _id: "$blockedUser._id",
                        username: "$blockedUser.username",
                        profilePic: "$blockedUser.profilePic",
                    },
                },
            },
        ]

        const blockedUsers = await Blocks.aggregate(pipeline)

        const hasMore = blockedUsers.length > limit
        if (hasMore) {
            blockedUsers.pop()
        }

        const nextCursor =
            hasMore && blockedUsers.length > 0
                ? blockedUsers[blockedUsers.length - 1].createdAt.toISOString()
                : null

        res.send({
            data: blockedUsers,
            nextCursor,
            hasMore,
        })
    } catch (error) {
        console.error("Error fetching blocked users:", error)
        res.status(500).send("Could not fetch blocked users")
    }
})

async function handleFollow(userId, targetUserId) {
    const targetUser = await User.findOne({ _id: targetUserId }).select("privacyStatus")
    if (!targetUser) return { error: "Cannot follow user" }

    if (targetUser.privacyStatus) {
        await Request.updateOne(
            { requester: userId, requested: targetUserId },
            { $setOnInsert: { requester: userId, requested: targetUserId } },
            { upsert: true }
        )

        return { type: "follow", private: true }
    } else {
        const session = await mongoose.startSession()
        session.startTransaction()

        try {
            const followResult = await Follow.updateOne(
                {
                    follower: userId,
                    following: targetUserId,
                },
                { $setOnInsert: { follower: userId, following: targetUserId } },
                { upsert: true, session }
            )

            if (!followResult.upsertedCount) throw new Error("Already following user")

            const targetUserUpdate = await User.updateOne(
                { _id: targetUserId },
                { $inc: { followerCount: 1 } },
                { session }
            )

            if (!targetUserUpdate.modifiedCount) throw new Error("Could not follow user")

            const userUpdate = await User.updateOne(
                { _id: userId },
                { $inc: { followingCount: 1 } },
                { session }
            )
            if (!userUpdate.modifiedCount) throw new Error("Could not follow user")

            await Notification.create(
                [
                    {
                        to: targetUser._id,
                        from: userId,
                        type: "follow",
                    },
                ],
                { session }
            )

            await session.commitTransaction()

            return { type: "follow", private: false }
        } catch (err) {
            await session.abortTransaction()
            return { error: err?.message ?? "Something failed. please try again later" }
        } finally {
            await session.endSession()
        }
    }
}

async function handleUnfollow(userId, targetUserId) {
    await Request.deleteOne({
        requester: userId,
        requested: targetUserId,
    })

    const session = await mongoose.startSession()

    try {
        await session.withTransaction(async () => {
            const { deletedCount } = await Follow.deleteOne(
                { follower: userId, following: targetUserId },
                { session }
            )
            if (!deletedCount) return

            await Notification.deleteOne(
                { to: targetUserId, from: userId, type: "follow" },
                { session }
            )

            await User.updateOne(
                { _id: targetUserId },
                { $inc: { followerCount: -1 } },
                { session }
            )
            await User.updateOne({ _id: userId }, { $inc: { followingCount: -1 } }, { session })
        })

        return { type: "unfollow" }
    } catch (err) {
        return { error: err?.message || "Could not unfollow user" }
    } finally {
        await session.endSession()
    }
}

function getUserProjectStage(additionalFields = {}) {
    const baseFields = {
        followers: "$followerCount",
        interests: 1,
        following: "$followingCount",
        // latestStory: {
        //     $cond: {
        //         if: {
        //             $or: [
        //                 { $eq: ["$_id", "$latestStory.creator"] },
        //                 { $eq: ["$isFollowing", true] },
        //                 { $eq: ["$privacyStatus", false] },
        //             ],
        //         },
        //         then: "$latestStory",
        //         else: "$$REMOVE",
        //     },
        // },
        isRequested: 1,
        isFollowing: 1,
        username: 1,
        profilePic: 1,
        completedJourneys: 1,
        bio: 1,
        privacyStatus: 1,
        location: 1,
    }

    return [
        {
            $project: {
                ...baseFields,
                ...additionalFields,
            },
        },
    ]
}

router.put("/update-password", [auth, validatePasswordChange], async (req, res) => {
    const userId = req.user._id
    const { currentPassword, newPassword } = req.body

    console.log("Current: " + currentPassword)
    console.log(newPassword)

    const user = await User.findOne({ _id: userId }).select("password")
    if (!user) return res.status(400).send("Could not find authenticated user")

    const validPassword = await bcrypt.compare(currentPassword, user.password)
    if (!validPassword) return res.status(400).send("Current password is incorrect")

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await user.updateOne({ password: hashedPassword })
    res.send("Password updated")
})

router.get("/followers/:userId", [auth], async (req, res) => {
    const { userId } = req.params
    const { cursor, limit = 20 } = req.query
    const requestingUserId = new mongoose.Types.ObjectId(req.user._id)
    const targetUserId = new mongoose.Types.ObjectId(userId)

    try {
        // Check if requesting user can view followers
        const targetUser = await User.findById(targetUserId).select("privacyStatus")
        if (!targetUser) return res.status(404).send("User not found")

        const isOwn = requestingUserId.equals(targetUserId)
        const isFollowing = await Follow.findOne({
            follower: requestingUserId,
            following: targetUserId,
        })

        if (targetUser.privacyStatus && !isOwn && !isFollowing) {
            return res.status(403).send("Cannot view followers of private account")
        }

        // Build query
        const query = { following: targetUserId }
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) }
        }

        const followers = await Follow.find(query)
            .populate({
                path: "follower",
                select: "username profilePic bio",
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) + 1)

        const hasMore = followers.length > limit
        if (hasMore) followers.pop()

        const nextCursor =
            hasMore && followers.length > 0
                ? followers[followers.length - 1].createdAt.toISOString()
                : null

        const followersData = followers.map((f) => f.follower)

        res.send({
            followers: followersData,
            nextCursor,
            hasMore,
        })
    } catch (error) {
        console.error("Error fetching followers:", error)
        res.status(500).send("Internal server error")
    }
})

router.post("/request-reset-password", async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) return res.status(400).send("No account found with provided email")

    const token = await createUserToken(user._id, "RESET_PASSWORD")

    const mailOptions = {
        to: user.email,
        from: config.get("GMAIL.email"),
        subject: "Password Reset",
        text: `Here is you're code to reset your password. Code: ${token}`,
    }
    await transporter.sendMail(mailOptions)

    res.send("Password reset link sent")
})

router.post("/verify_reset_token", async (req, res) => {
    const { token, email } = req.body
    if (!token || !email) return res.status(400).send("Missing fields")

    try {
        await verifyUserToken({ email }, "RESET_PASSWORD", token, false)
        res.send(token)
    } catch (err) {
        const message = err?.message || "Something failed, please try again later."
        return res.status(400).send(message)
    }
})

router.post("/reset-password", async (req, res) => {
    const { token, email, newPassword } = req.body
    if (!token || !newPassword) return res.status(400).send("Cannot reset password")

    if (newPassword.length < 6)
        return res.status(400).send("Password must be at least 6 characters")

    try {
        await verifyUserToken({ email }, "RESET_PASSWORD", token, true)
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        await User.updateOne({ email }, { password: hashedPassword })
        res.send("Password reset")
    } catch (err) {
        const message = err?.message || "Something failed, please try again later."
        return res.status(400).send(message)
    }
})

router.post("/request-email-change", [auth, validateEmail], async (req, res) => {
    const userId = req.user._id

    const { email } = req.body
    if (!email) return res.status(400).send("No new email provided")

    const user = await User.findById(userId)
    if (!user) return res.status(400).send("No account found")

    const existing = await User.findOne({ email })
    if (existing) return res.status(400).send("Email already in use")

    const mailOptions = {
        to: email,
        from: config.get("GMAIL_EMAIL"),
        subject: "Change email",
        text: `Here is you're code to change your email. Code: ${token}`,
    }

    await transporter.sendMail(mailOptions)

    res.send("Change email request successful")
})

router.get("/following/:userId", [auth], async (req, res) => {
    const { userId } = req.params
    const { cursor, limit = 20 } = req.query
    const requestingUserId = new mongoose.Types.ObjectId(req.user._id)
    const targetUserId = new mongoose.Types.ObjectId(userId)

    try {
        // Check if requesting user can view following
        const targetUser = await User.findById(targetUserId).select("privacyStatus")
        if (!targetUser) return res.status(404).send("User not found")

        const isOwn = requestingUserId.equals(targetUserId)
        const isFollowing = await Follow.findOne({
            follower: requestingUserId,
            following: targetUserId,
        })

        if (targetUser.privacyStatus && !isOwn && !isFollowing) {
            return res.status(403).send("Cannot view following of private account")
        }

        // Build query
        const query = { follower: targetUserId }
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) }
        }

        const following = await Follow.find(query)
            .populate({
                path: "following",
                select: "username profilePic bio",
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) + 1)

        const hasMore = following.length > limit
        if (hasMore) following.pop()

        const nextCursor =
            hasMore && following.length > 0
                ? following[following.length - 1].createdAt.toISOString()
                : null

        const followingData = following.map((f) => f.following)

        res.send({
            following: followingData,
            nextCursor,
            hasMore,
        })
    } catch (error) {
        console.error("Error fetching following:", error)
        res.status(500).send("Internal server error")
    }
})

router.get("/followers/:userId", [auth], async (req, res) => {
    const { userId } = req.params
    const { cursor, limit = 20 } = req.query
    const requestingUserId = new mongoose.Types.ObjectId(req.user._id)
    const targetUserId = new mongoose.Types.ObjectId(userId)

    try {
        // Check if requesting user can view followers
        const targetUser = await User.findById(targetUserId).select("privacyStatus")
        if (!targetUser) return res.status(404).send("User not found")

        const isOwn = requestingUserId.equals(targetUserId)
        const isFollowing = await Follow.findOne({
            follower: requestingUserId,
            following: targetUserId,
        })

        if (targetUser.privacyStatus && !isOwn && !isFollowing) {
            return res.status(403).send("Cannot view followers of private account")
        }

        // Build query
        const query = { following: targetUserId }
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) }
        }

        const followers = await Follow.find(query)
            .populate({
                path: "follower",
                select: "username profilePic bio",
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) + 1)

        const hasMore = followers.length > limit
        if (hasMore) followers.pop()

        const nextCursor =
            hasMore && followers.length > 0
                ? followers[followers.length - 1].createdAt.toISOString()
                : null

        const followersData = followers.map((f) => f.follower)

        res.send({
            followers: followersData,
            nextCursor,
            hasMore,
        })
    } catch (error) {
        console.error("Error fetching followers:", error)
        res.status(500).send("Internal server error")
    }
})

router.get("/following/:userId", [auth], async (req, res) => {
    const { userId } = req.params
    const { cursor, limit = 20 } = req.query
    const requestingUserId = new mongoose.Types.ObjectId(req.user._id)
    const targetUserId = new mongoose.Types.ObjectId(userId)

    try {
        // Check if requesting user can view following
        const targetUser = await User.findById(targetUserId).select("privacyStatus")
        if (!targetUser) return res.status(404).send("User not found")

        const isOwn = requestingUserId.equals(targetUserId)
        const isFollowing = await Follow.findOne({
            follower: requestingUserId,
            following: targetUserId,
        })

        if (targetUser.privacyStatus && !isOwn && !isFollowing) {
            return res.status(403).send("Cannot view following of private account")
        }

        // Build query
        const query = { follower: targetUserId }
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) }
        }

        const following = await Follow.find(query)
            .populate({
                path: "following",
                select: "username profilePic bio",
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) + 1)

        const hasMore = following.length > limit
        if (hasMore) following.pop()

        const nextCursor =
            hasMore && following.length > 0
                ? following[following.length - 1].createdAt.toISOString()
                : null

        const followingData = following.map((f) => f.following)

        res.send({
            following: followingData,
            nextCursor,
            hasMore,
        })
    } catch (error) {
        console.error("Error fetching following:", error)
        res.status(500).send("Internal server error")
    }
})

router.get("/connect-list", [unrequiredAuth], async (req, res) => {
    const userId = req.user ? new mongoose.Types.ObjectId(req.user._id) : null
    const { search = "", sort = "createdAt", tags, limit = 10, cursor, category } = req.query
    const query = {}
    // Default to newest users first without relying on createdAt (not guaranteed to exist)
    let sortObj = { _id: -1 }

    await delay(6000)

    // Exclude self if authenticated
    if (userId) query._id = { $ne: userId }

    if (sort === "category" && category) {
        // Filter users whose interests include the selected category
        query.interests = { $in: [category] }
        // Within a category, still show newest first
        sortObj = { _id: -1 }
        if (search) {
            // If search term is present, match username or location as well
            query.$or = [
                { username: { $regex: new RegExp(search, "i") } },
                { location: { $regex: new RegExp(search, "i") } },
            ]
        }
    } else if (sort === "location") {
        if (search) {
            query.location = { $regex: new RegExp(search, "i") }
        } else {
            if (userId) {
                const authUser = await User.findById(userId)
                if (authUser && authUser.location) {
                    const parts = authUser.location.split(",").map((s) => s.trim())
                    const country = parts.length > 1 ? parts[parts.length - 1] : authUser.location
                    query.location = { $regex: new RegExp(country, "i") }
                }
            }
        }
        // Sort alphabetically by location, then newest
        sortObj = { location: 1, _id: -1 }
    } else if (sort === "username") {
        if (search) {
            query.username = { $regex: new RegExp(search, "i") }
        }
        // If no search, just fetch latest users (newest by ObjectId timestamp)
        sortObj = { _id: -1 }
    } else {
        // fallback: default to newest users
        if (search) query.username = { $regex: new RegExp(search, "i") }
        sortObj = { _id: -1 }
    }
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] }
    if (cursor) {
        const idCond = query._id || {}
        idCond.$lt = new mongoose.Types.ObjectId(cursor)
        query._id = idCond
    }
    const project = getUserProjectStage()
    const storyLookupStage = userId ? getStoryLookupStage(userId, "$_id") : []
    const followAndRequestFieldsStages = userId
        ? getFollowAndRequestFieldsStages(userId, "$_id")
        : []
    const pipeline = [
        { $match: query },
        ...followAndRequestFieldsStages,
        ...storyLookupStage,
        { $sort: sortObj },
        { $limit: parseInt(limit) },
        ...project,
    ]
    const users = await User.aggregate(pipeline)
    const nextCursor = users.length === parseInt(limit) ? users[users.length - 1]._id : null
    res.send({ users, nextCursor })
})

// Get recent user searchers
router.get("/recent-searchers", [auth], async (req, res) => {
    const userId = req.user._id

    const user = await User.findById(userId).populate({
        path: "recentUserSearchers",
        select: "username profilePic bio",
        options: { limit: 50 },
    })

    if (!user) return res.status(400).send("User not found")

    res.send(user.recentUserSearchers || [])
})

// Add user to recent searchers
router.post("/recent-searchers", [auth], async (req, res) => {
    const userId = req.user._id
    const { targetUserId } = req.body

    if (!targetUserId) return res.status(400).send("Target user ID is required")

    try {
        const user = await User.findById(userId)
        if (!user) return res.status(400).send("User not found")

        // Remove the user if already exists (to maintain order)
        user.recentUserSearchers = user.recentUserSearchers.filter(
            (id) => id.toString() !== targetUserId
        )

        // Add to the beginning of the array
        user.recentUserSearchers.unshift(targetUserId)

        // Keep only the latest 50
        if (user.recentUserSearchers.length > 50) {
            user.recentUserSearchers = user.recentUserSearchers.slice(0, 50)
        }

        await user.save()
        res.send({ success: true })
    } catch (error) {
        console.log(error)
        res.status(400).send("Failed to update recent searchers")
    }
})

// Remove user from recent searchers
router.delete("/recent-searchers/:targetUserId", [auth], async (req, res) => {
    const userId = req.user._id
    const { targetUserId } = req.params

    try {
        const user = await User.findById(userId)
        if (!user) return res.status(400).send("User not found")

        user.recentUserSearchers = user.recentUserSearchers.filter(
            (id) => id.toString() !== targetUserId
        )

        await user.save()
        res.send({ success: true })
    } catch (error) {
        res.status(400).send("Failed to remove from recent searchers")
    }
})

// Clear all recent searchers
router.delete("/recent-searchers", [auth], async (req, res) => {
    const userId = req.user._id

    try {
        const user = await User.findById(userId)
        if (!user) return res.status(400).send("User not found")

        user.recentUserSearchers = []
        await user.save()
        res.send({ success: true })
    } catch (error) {
        res.status(400).send("Failed to clear recent searchers")
    }
})

// Remove a follower
router.delete("/remove-follower/:followerId", [auth], async (req, res) => {
    const userId = req.user._id
    const followerId = req.params.followerId

    if (!followerId) return res.status(400).send("Invalid follower ID")

    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {
            // Remove the follow relationship
            await Follow.deleteOne(
                {
                    follower: followerId,
                    following: userId,
                },
                { session }
            )

            // Update follower counts
            await User.updateOne({ _id: userId }, { $inc: { followerCount: -1 } }, { session })
            await User.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } }, { session })
        })

        res.send({ message: "Follower removed successfully" })
    } catch (error) {
        console.error("Error removing follower:", error)
        res.status(500).send("Could not remove follower")
    } finally {
        session.endSession()
    }
})

async function createUserToken(userId, tokenType, payload = null) {
    const token = uuidv4()
    const tokenExpiry = Date.now() + 15 * 60 * 1000
    const salt = await bcrypt.genSalt(10)
    const hashedToken = await bcrypt.hash(token, salt)

    await UserTokens.updateOne(
        { userId, type: tokenType },
        {
            $set: {
                type: tokenType,
                token: hashedToken,
                tokenExpiry,
                payload,
                userId,
            },
        },
        { upsert: true }
    )

    return token
}

async function verifyUserToken(identifier, type, token, deleteTokenAfterVerify) {
    if (!identifier || !token) throw new Error("Invalid or expired token")

    const user = await User.findOne(identifier).select("_id")
    if (!user) throw new Error("Cannot find user")

    const tokenDoc = await UserTokens.findOne({
        userId: user._id,
        type,
        tokenExpiry: { $gt: new Date() },
    })
    if (!tokenDoc) throw new Error("Invalid or expired token")

    const payload = tokenDoc.payload || {}
    const isValid = await bcrypt.compare(token, tokenDoc.token)
    if (!isValid) throw new Error("Invalid token")

    if (deleteTokenAfterVerify) await tokenDoc.deleteOne()

    return payload
}

async function createUserToken(userId, tokenType, payload = null) {
    const token = uuidv4()
    const tokenExpiry = Date.now() + 15 * 60 * 1000
    const salt = await bcrypt.genSalt(10)
    const hashedToken = await bcrypt.hash(token, salt)

    await UserTokens.updateOne(
        { userId, type: tokenType },
        {
            $set: {
                type: tokenType,
                token: hashedToken,
                tokenExpiry,
                payload,
                userId,
            },
        },
        { upsert: true }
    )

    return token
}

module.exports = router
