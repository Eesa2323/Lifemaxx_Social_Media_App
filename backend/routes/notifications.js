const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const { Notification } = require("../models/Notification")
const { User, Blocks } = require("../models/User")
const { Request, Follow } = require("../models/Follow")
const { getPaginatedResponse, getStoryLookupStage } = require("../utils/helper")
const mongoose = require("mongoose")

router.get("/get_unread_count", [auth], async (req, res) => {
    const userId = req.user._id

    const user = await User.findOne({ _id: userId }).select("lastReadNotificationTime")
    if (!user) return res.status(400).send("Could not find user")

    const notificationCount = Notification.countDocuments({
        to: userId,
        createdAt: { $gt: user.lastReadNotificationTime },
    })

    const requestCount = Request.countDocuments({
        requested: userId,
        createdAt: { $gt: user.lastReadNotificationTime },
    })

    const [notifCount, reqCount] = await Promise.all([notificationCount, requestCount])
    res.send({ count: notifCount + reqCount })
})

router.get("/requests", [auth], async (req, res) => {
    const LIMIT = 30
    const { timestamp } = req.query
    const userId = new mongoose.Types.ObjectId(req.user._id)

    console.log(timestamp)
    console.log(userId)

    // First get list of blocked users in both directions
    const blocks = await Blocks.find({
        $or: [{ blocker: userId }, { blocked: userId }],
    })

    const blockedUsers = blocks.map((block) =>
        block.blocker.equals(userId) ? block.blocked : block.blocker
    )

    const matchStage = timestamp
        ? {
              requested: userId,
              requester: { $nin: blockedUsers },
              createdAt: { $lte: new Date(timestamp) },
          }
        : {
              requested: userId,
              requester: { $nin: blockedUsers },
          }

    const storyLookupStage = getStoryLookupStage(userId, "$requester._id")

    const pipeline = [
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
        {
            $lookup: {
                from: "users",
                localField: "requester",
                foreignField: "_id",
                as: "requester",
                pipeline: [{ $project: { username: 1, profilePic: 1 } }],
            },
        },
        { $unwind: "$requester" },
        ...storyLookupStage,
    ]

    const requests = await Request.aggregate(pipeline)
    const { data, nextCursor } = getPaginatedResponse(requests, LIMIT)
    res.send({ requests: data, nextCursor })
})

router.get("/", [auth], async (req, res) => {
    const LIMIT = 30
    const { timestamp } = req.query
    const userId = req.user._id
    // First get list of blocked users in both directions
    const blocks = await Blocks.find({
        $or: [{ blocker: userId }, { blocked: userId }],
    })

    const blockedUsers = blocks.map((block) =>
        block.blocker.equals(userId) ? block.blocked : block.blocker
    )

    const matchStage = timestamp
        ? {
              to: new mongoose.Types.ObjectId(userId),
              from: { $nin: blockedUsers },
              createdAt: { $lte: new Date(timestamp) },
          }
        : {
              to: new mongoose.Types.ObjectId(userId),
              from: { $nin: blockedUsers },
          }

    // Let's also check if there are any notifications at all for this user
    const totalNotifications = await Notification.countDocuments({ to: userId })

    // Let's check all notifications for this user without any date filtering
    const allNotifications = await Notification.find({ to: userId }).limit(5)

    // First, let's just get the basic notifications without any population
    const basicPipeline = [
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
    ]

    const basicNotifications = await Notification.aggregate(basicPipeline)

    if (basicNotifications.length > 0) {
        console.log("First notification:", JSON.stringify(basicNotifications[0], null, 2))
    }

    // Now let's add the user lookup and reference population
    const storyLookupStage = userId
        ? getStoryLookupStage(new mongoose.Types.ObjectId(userId), "$from._id")
        : []

    const userPipeline = [
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
        {
            $lookup: {
                from: "users",
                localField: "from",
                foreignField: "_id",
                as: "from",
                pipeline: [{ $project: { username: 1, profilePic: 1 } }],
            },
        },
        { $unwind: "$from" },
        ...storyLookupStage,
        {
            $lookup: {
                from: "posts",
                let: { postIds: "$references.data" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ["$_id", "$$postIds"] },
                        },
                    },
                    { $project: { caption: 1, fileName: 1, community: 1, journey: 1 } },
                ],
                as: "postData",
            },
        },
        {
            $lookup: {
                from: "comments",
                let: { commentIds: "$references.data" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ["$_id", "$$commentIds"] },
                        },
                    },
                    { $project: { content: 1 } },
                ],
                as: "commentData",
            },
        },
        {
            $addFields: {
                references: {
                    $map: {
                        input: "$references",
                        as: "ref",
                        in: {
                            modelRef: "$$ref.modelRef",
                            data: {
                                $cond: {
                                    if: { $eq: ["$$ref.modelRef", "Post"] },
                                    then: { $arrayElemAt: ["$postData", 0] },
                                    else: { $arrayElemAt: ["$commentData", 0] },
                                },
                            },
                        },
                    },
                },
            },
        },
        { $project: { postData: 0, commentData: 0 } },
    ]

    const notificationsWithUser = await Notification.aggregate(userPipeline)

    // For now, let's just return the basic notifications with user data
    // We'll handle reference population later
    const { data, nextCursor } = getPaginatedResponse(notificationsWithUser, LIMIT)
    const response = { notifications: data, nextCursor }

    res.send(response)
})

router.put("/handle_follow_request/:requestid", [auth], async (req, res) => {
    const ablyRest = req.app.get("ablyRest")
    const userId = req.user._id
    const requestid = req.params.requestid
    const acceptedValue = req.body.value
    if (typeof acceptedValue !== "boolean" || !requestid)
        return res.status(400).send("Cannot handle follow request")

    // Check for blocks before handling request
    const request = await Request.findOne({ _id: requestid, requested: userId })
    if (!request) return res.status(400).send("Request not found")

    const blockExists = await Blocks.findOne({
        $or: [
            { blocker: userId, blocked: request.requester },
            { blocker: request.requester, blocked: userId },
        ],
    })
    if (blockExists) return res.status(400).send("Cannot handle request due to block")

    if (!acceptedValue) {
        await Request.deleteOne({ _id: requestid, requested: userId })
        return res.send({ accepted: false })
    }

    const session = await Request.startSession()
    try {
        let notification = null
        session.startTransaction()

        const request = await Request.findOneAndDelete(
            { _id: requestid, requested: userId },
            { new: false }
        )

        if (!request) throw new Error("Could not accept request")

        const follow = await Follow.updateOne(
            { follower: request.requester, following: userId },
            {
                $setOnInsert: {
                    follower: request.requester,
                    following: userId,
                    createdAt: new Date(),
                },
            },
            { upsert: true, session }
        )

        if (follow.upsertedCount > 0) {
            notification = await Notification.create(
                [
                    {
                        to: userId,
                        from: request.requester,
                        type: "follow",
                    },
                ],
                { session }
            )

            const userUpdate = await User.updateOne(
                { _id: userId },
                { $inc: { followerCount: 1 } },
                { session }
            )

            const targetUserUpdate = await User.updateOne(
                { _id: request.requester },
                { $inc: { followingCount: 1 } },
                { session }
            )

            if (!userUpdate.modifiedCount || !targetUserUpdate.modifiedCount)
                throw new Error("Could not accept request")
        }

        await session.commitTransaction()

        const eventData = { username: req.user.username }
        ablyRest.channels
            .get(`notifications:${request.requester.toString()}`)
            .publish("accepted_request", eventData)

        const response = { accepted: true, ...(notification !== null && { notification }) }
        return res.send(response)
    } catch (err) {
        console.log(err)
        await session.abortTransaction()

        return res.status(500).send("Failed to accept follow request")
    } finally {
        session.endSession()
    }
})

router.put("/update_read_timestamp", [auth], async (req, res) => {
    const user = await User.updateOne(
        { _id: req.user._id },
        { lastReadNotificationTime: new Date() }
    )
    if (!user.modifiedCount) return res.status(400).send("Cannot update notification timestamp")

    res.send("Notification timestamp updated")
})

// DELETE notification by ID
router.delete("/:id", [auth], async (req, res) => {
    const notifId = req.params.id
    const userId = req.user._id
    const notif = await Notification.findOne({ _id: notifId, to: userId })
    if (!notif) return res.status(404).send({ message: "Notification not found" })
    await Notification.deleteOne({ _id: notifId })
    res.send({ success: true })
})

module.exports = router
