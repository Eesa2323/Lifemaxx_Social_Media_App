const express = require("express")
const router = express.Router()
const fileUpload = require("express-fileupload")
const auth = require("../middleware/auth")
const { Journey } = require("../models/Journey")
const { User, Blocks } = require("../models/User")
const unrequiredAuth = require("../middleware/unrequiredAuth")
const mongoose = require("mongoose")
const { getContentAuthorizedStage, getStoryLookupStage, delay } = require("../utils/helper")
const { uploadToLocal } = require("../utils/upload")
const { validateJourneyCreation } = require("../middleware/validation")

const JOURNEY_FILE_UPLOAD_CONFIG = fileUpload({
    limits: {
        fileSize: 60 * 1024 * 1024,
    },
    useTempFiles: false,
    abortOnLimit: true,
    responseOnLimit: "File size is too large. Max size is 10MB",
    createParentPath: false,
})

router.get("/", [unrequiredAuth], async (req, res) => {
    const LIMIT = 20
    const { cursor, id } = req.query
    if (!id) return res.status(400).send({ message: "Journey ID is required" })

    const authId = req.user?._id && new mongoose.Types.ObjectId(req.user._id)

    // Check for blocks if user is authenticated
    if (authId) {
        const blockExists = await Blocks.findOne({
            $or: [
                { blocker: authId, blocked: new mongoose.Types.ObjectId(id) },
                { blocker: new mongoose.Types.ObjectId(id), blocked: authId },
            ],
        })

        if (blockExists) {
            return res.status(403).send({ message: "Cannot view journeys from this user" })
        }
    }

    const authStage = getContentAuthorizedStage(authId)
    const storyLookupStage = authId ? getStoryLookupStage(authId, "$creator._id") : []
    const match = {
        creator: new mongoose.Types.ObjectId(id),
        ...(cursor && { createdAt: { $lt: new Date(cursor) } }),
    }
    const pipeline = [
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
        { $lookup: { from: "users", localField: "creator", foreignField: "_id", as: "creator" } },
        { $unwind: "$creator" },
        ...authStage,
        ...storyLookupStage,
        { $project: { follows: 0, isFollower: 0 } },
    ]

    const journeys = await Journey.aggregate(pipeline)
    const hasNextPage = journeys.length > LIMIT
    const data = hasNextPage ? journeys.slice(0, -1) : journeys

    res.send({
        data,
        nextCursor: hasNextPage ? journeys[LIMIT - 1].createdAt.toISOString() : undefined,
    })
})

router.get("/:id", [unrequiredAuth], async (req, res) => {
    const { id } = req.params
    if (!id) return res.status(400).send({ message: "Journey ID is required" })

    try {
        const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null

        // If user is authenticated, check for blocks before proceeding
        if (userId) {
            // First get the journey creator
            const journey = await Journey.findById(id).select("creator")
            if (!journey) {
                return res.status(404).send({ message: "Journey not found" })
            }

            // Check for blocks between user and journey creator
            const blockExists = await Blocks.findOne({
                $or: [
                    { blocker: userId, blocked: journey.creator },
                    { blocker: journey.creator, blocked: userId },
                ],
            })

            if (blockExists) {
                return res.status(403).send({ message: "Cannot view this journey" })
            }
        }

        const storyLookupStage = userId ? getStoryLookupStage(userId, "$creator._id") : []

        const pipeline = [
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: "users",
                    localField: "creator",
                    foreignField: "_id",
                    as: "creator",
                    pipeline: [{ $project: { username: 1, profilePic: 1 } }],
                },
            },
            { $unwind: "$creator" },
            ...storyLookupStage,
        ]

        const journeys = await Journey.aggregate(pipeline)
        const journey = journeys[0]

        if (!journey) return res.status(404).send({ message: "Journey not found" })

        res.send(journey)
    } catch (error) {
        console.error(error)
        res.status(500).send({ message: "Server error" })
    }
})

router.post("/", [auth, JOURNEY_FILE_UPLOAD_CONFIG, validateJourneyCreation], async (req, res) => {
    const { title, description, tags } = req.body
    const file = req.files && req.files.file

    try {
        const mediaUrl = file ? await uploadToLocal(file, "journeyThumbnails") : ""

        const journey = await Journey.create({
            title,
            description,
            tags,
            url: mediaUrl,
            creator: req.user._id,
        })

        res.send({ journey })
    } catch (error) {
        console.error("Journey creation error:", error)
        res.status(500).send({ message: "Failed to create journey" })
    }
})

router.put("/mark_complete/:id", [auth], async (req, res) => {
    const { id } = req.params
    if (!id) return res.status(400).send({ message: "Journey ID is required" })

    await Journey.findByIdAndUpdate(id, { $set: { status: true } })
    const journey = await Journey.findById(id)
    if (journey && journey.creator) {
        await User.updateOne({ _id: journey.creator }, { $inc: { completedJourneys: 1 } })
    }
    res.send("Complete")
})

router.put("/mark_incomplete/:id", [auth], async (req, res) => {
    const { id } = req.params
    if (!id) return res.status(400).send({ message: "Journey ID is required" })

    await Journey.findByIdAndUpdate(id, { $set: { status: false } })
    const journey = await Journey.findById(id)
    if (journey && journey.creator) {
        await User.updateOne(
            { _id: journey.creator, completedJourneys: { $gt: 0 } },
            { $inc: { completedJourneys: -1 } }
        )
    }
    res.send("Incomplete")
})

router.delete("/:id", [auth], async (req, res) => {
    const { id } = req.params
    if (!id) return res.status(400).send({ message: "Journey ID is required" })

    try {
        const journey = await Journey.findById(id)
        if (!journey) return res.status(404).send({ message: "Journey not found" })

        // Check if user is the creator
        if (journey.creator.toString() !== req.user._id.toString()) {
            return res.status(403).send({ message: "You can only delete your own journeys" })
        }

        // Delete all posts associated with this journey
        const { Post } = require("../models/Post")
        await Post.deleteMany({ journey: id })

        // Delete the journey
        await Journey.findByIdAndDelete(id)

        // Update user's completed journeys count if journey was completed
        if (journey.status && journey.creator) {
            await User.updateOne(
                { _id: journey.creator, completedJourneys: { $gt: 0 } },
                { $inc: { completedJourneys: -1 } }
            )
        }

        res.send({ message: "Journey deleted successfully" })
    } catch (error) {
        console.error(error)
        res.status(500).send({ message: "Server error" })
    }
})

module.exports = router
