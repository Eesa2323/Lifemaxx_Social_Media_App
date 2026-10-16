const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const unrequiredAuth = require("../middleware/unrequiredAuth")
const { validateStartupCreation } = require("../middleware/validation")
const { Startup } = require("../models/Startup")
const {
    getPaginatedResponse,
    getStoryLookupStage,
    getBlockExclusionStages,
} = require("../utils/helper")
const { User, Blocks } = require("../models/User")
const mongoose = require("mongoose")

router.get("/search", unrequiredAuth, async (req, res) => {
    const { searchTerm, type, cursor } = req.query
    const LIMIT = 30
    const userId = req.user ? new mongoose.Types.ObjectId(req.user._id) : null

    const matchStage = {
        $match: {
            ...(cursor && { createdAt: { $lte: new Date(cursor) } }),
            ...(userId ? { creator: { $ne: userId } } : {}),
        },
    }

    const blockStages = await getBlockExclusionStages(userId, "$creator._id")

    if (searchTerm) {
        const regex = new RegExp(searchTerm, "i")
        if (type === "Keywords") {
            matchStage.$match.keywords = { $elemMatch: { $regex: regex } }
        } else {
            matchStage.$match.$or = [{ title: { $regex: regex } }, { caption: { $regex: regex } }]
        }
    }

    const storyLookupStage = userId ? getStoryLookupStage(userId, "$creator._id") : []

    const pipeline = [
        matchStage,
        ...blockStages,
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
                pipeline: [
                    { $project: { username: 1, profilePic: 1, location: 1, completedJourneys: 1 } },
                ],
            },
        },
        { $unwind: "$creator" },
        ...storyLookupStage,
    ]

    const startups = await Startup.aggregate(pipeline)
    const { data, nextCursor } = getPaginatedResponse(startups, LIMIT)
    const response = { data, nextCursor }

    res.send(response)
})

router.get("/", auth, async (req, res) => {
    const LIMIT = 30
    const { cursor } = req.query
    const userId = new mongoose.Types.ObjectId(req.user._id)

    const matchStage = {
        $match: {
            creator: userId,
            ...(cursor && { createdAt: { $lte: new Date(cursor) } }),
        },
    }

    const storyLookupStage = getStoryLookupStage(userId, "$creator._id")

    const pipeline = [
        matchStage,
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
                pipeline: [
                    { $project: { username: 1, profilePic: 1, location: 1, completedJourneys: 1 } },
                ],
            },
        },
        { $unwind: "$creator" },
        ...storyLookupStage,
    ]

    const startups = await Startup.aggregate(pipeline)
    const { data, nextCursor } = getPaginatedResponse(startups, LIMIT)
    const response = { data, nextCursor }

    res.send(response)
})

router.post("/", [auth, validateStartupCreation], async (req, res) => {
    const userId = req.user._id
    const { title, description, keywords } = req.body

    const startup = await Startup.create({
        title,
        description,
        creator: userId,
        ...(keywords && { keywords }),
    })

    res.send(startup)
})

router.put("/:id", [auth, validateStartupCreation], async (req, res) => {
    const userId = req.user._id
    const startupId = req.params.id
    const { title, description, keywords } = req.body

    console.log(startupId)

    const startup = await Startup.findOneAndUpdate(
        { _id: startupId, creator: userId },
        {
            title,
            description,
            ...(keywords && { keywords }),
        },
        { new: true }
    )

    console.log(startup)

    if (!startup) return res.status(404).send("Startup not found or unauthorized")

    res.send(startup)
})

router.delete("/:id", auth, async (req, res) => {
    const userId = req.user._id
    const startupId = req.params.id

    const startup = await Startup.findOneAndDelete({ _id: startupId, creator: userId })

    if (!startup) return res.status(404).send("Startup not found or unauthorized")

    res.send(startup)
})

module.exports = router
