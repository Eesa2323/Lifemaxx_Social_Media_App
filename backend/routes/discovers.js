const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const { Journey } = require("../models/Journey")
const { Blocks } = require("../models/User")
const { delay } = require("../utils/helper")
const {
    getContentAuthorizedStage,
    getPaginatedResponse,
    getStoryLookupStage,
} = require("../utils/helper")
const unrequiredAuth = require("../middleware/unrequiredAuth")

router.get("/", unrequiredAuth, async (req, res) => {
    const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null
    const { search = "", category, cursor } = req.query
    const LIMIT = 30

    // Get blocked users if authenticated
    let blockedUserIds = []
    if (userId) {
        const blocks = await Blocks.find({
            $or: [{ blocker: userId }, { blocked: userId }],
        }).select("blocker blocked")

        blockedUserIds = blocks.map((block) =>
            block.blocker.equals(userId) ? block.blocked : block.blocker
        )
    }

    const matchStage = { $match: {} }
    if (search && search.trim() !== "") {
        matchStage.$match.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ]
    }
    if (category && category !== "All") {
        matchStage.$match.tags = { $in: [category] }
    }
    if (cursor) {
        matchStage.$match.createdAt = { $lt: new Date(cursor) }
    }
    if (userId) {
        matchStage.$match.creator = {
            $ne: userId,
            $nin: blockedUserIds,
        }
    }

    const s = getContentAuthorizedStage(userId)
    const storyLookupStage = userId ? getStoryLookupStage(userId, "$creator._id") : []

    const pipeline = [
        matchStage,
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
            },
        },
        { $unwind: "$creator" },
        ...s,
        ...storyLookupStage,
        {
            $project: {
                title: 1,
                description: 1,
                category: 1,
                image: 1,
                url: 1,
                creator: 1,
                createdAt: 1,
                tags: 1,
            },
        },
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
    ]

    const journeys = await Journey.aggregate(pipeline)
    const { data, nextCursor } = getPaginatedResponse(journeys, LIMIT)
    res.send({ journeys: data, nextCursor })
})

module.exports = router
