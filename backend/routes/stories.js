const express = require("express")
const router = express.Router()
const path = require("path")
const fs = require("fs")
const Story = require("../models/Story")
const { Follow } = require("../models/Follow")
const auth = require("../middleware/auth")
const fileUpload = require("express-fileupload")
const { uploadToLocal } = require("../utils/upload")
const { delay, checkBlockExistance } = require("../utils/helper")
const { User, Blocks } = require("../models/User")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const config = require("config")

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
    return id && mongoose.Types.ObjectId.isValid(id)
}
const POST_FILE_UPLOAD_CONFIG = fileUpload({
    limits: {
        fileSize: 60 * 1024 * 1024, // 60MB
    },
    useTempFiles: true, // Use temp files for large uploads
    abortOnLimit: false, // Don't abort, let us handle the error
    createParentPath: false,
    parseNested: true, // Parse nested objects in form data
    debug: process.env.NODE_ENV === "development", // Enable debug in development
})

// Error handling middleware for file uploads
const handleFileUploadErrors = (err, req, res, next) => {
    if (err) {
        console.error("File upload error:", err)
        if (err.code === "LIMIT_FILE_SIZE") {
            return res
                .status(400)
                .json({ message: "File size is too large. Maximum size is 60MB." })
        }
        return res.status(400).json({ message: "File upload error: " + err.message })
    }
    next()
}

router.post("/", auth, POST_FILE_UPLOAD_CONFIG, handleFileUploadErrors, async (req, res) => {
    try {
        // Debug logging
        // Check if req.body exists
        if (!req.body) {
            return res.status(400).json({
                message:
                    "Request body is missing. This might be due to file size exceeding limits or malformed request.",
            })
        }

        const { content, textBoxes, drawings, cropData } = req.body
        const file = req.files && (req.files.media || req.files.file)

        console.log("Parsed file:", file)

        // Parse JSON strings if they exist
        let parsedTextBoxes = []
        let parsedDrawings = []
        let parsedCropData = null

        if (textBoxes) {
            try {
                parsedTextBoxes = JSON.parse(textBoxes)
            } catch (e) {
                return res.status(400).json({ message: "Invalid textBoxes format" })
            }
        }

        if (drawings) {
            try {
                parsedDrawings = JSON.parse(drawings)
            } catch (e) {
                return res.status(400).json({ message: "Invalid drawings format" })
            }
        }

        if (cropData) {
            try {
                parsedCropData = JSON.parse(cropData)
            } catch (e) {
                return res.status(400).json({ message: "Invalid cropData format" })
            }
        }

        // Validate that story has some content
        if (!content && !file && parsedTextBoxes.length === 0 && parsedDrawings.length === 0) {
            return res.status(400).json({ message: "Story must have some content" })
        }

        // Create story object
        const storyData = {
            user: req.user._id,
            content: content || "",
            textBoxes: parsedTextBoxes,
            drawings: parsedDrawings,
        }

        // Add media info if file was uploaded
        if (file) {
            // Validate file type
            const allowedImageTypes = [
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/gif",
                "image/webp",
            ]
            const allowedVideoTypes = [
                "video/mp4",
                "video/webm",
                "video/ogg",
                "video/avi",
                "video/mov",
                "video/quicktime",
            ]
            const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes]

            if (!allAllowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    message:
                        "Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, OGG, AVI, MOV) are allowed.",
                })
            }

            // Validate file size (additional check beyond middleware)
            const maxSize = 60 * 1024 * 1024 // 60MB
            if (file.size > maxSize) {
                return res.status(400).json({
                    message: "File size is too large. Maximum size is 60MB.",
                })
            }

            console.log("File upload - Original filename:", file.name)
            console.log("File upload - File size:", file.size)
            console.log("File upload - File mimetype:", file.mimetype)
            console.log("File upload - File data length:", file.data ? file.data.length : "No data")

            const mediaUrl = await uploadToLocal(file, "stories")
            console.log("File upload - Media URL:", mediaUrl)

            // Verify the file was saved correctly
            const savedFilePath = path.join(__dirname, "..", mediaUrl)
            console.log("File upload - Saved file path:", savedFilePath)

            if (fs.existsSync(savedFilePath)) {
                const savedFileStats = fs.statSync(savedFilePath)
                console.log("File upload - Saved file size:", savedFileStats.size)
                console.log("File upload - File saved successfully")
            } else {
                console.log("File upload - ERROR: File was not saved!")
            }

            storyData.mediaUrl = mediaUrl
            storyData.mediaType = file.mimetype.startsWith("image/") ? "image" : "video"
        }

        // Add crop data if provided
        if (parsedCropData) {
            storyData.cropData = parsedCropData
        }

        const story = new Story(storyData)
        await story.save()

        // Populate user info before sending response
        await story.populate("user", "username profilePicture")

        res.status(201).json({
            message: "Story created successfully",
            story,
        })
    } catch (error) {
        console.error("Error creating story:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
})

// @route   GET /api/stories/feed
// @desc    Get stories from users we follow
// @access  Private
router.get("/feed", auth, async (req, res) => {
    try {
        const stories = await Story.aggregate([
            // First get the users we follow
            {
                $lookup: {
                    from: "follows",
                    let: {},
                    pipeline: [
                        {
                            $match: {
                                follower: new mongoose.Types.ObjectId(req.user._id),
                            },
                        },
                        {
                            $project: {
                                following: 1,
                            },
                        },
                    ],
                    as: "followData",
                },
            },
            // Match stories from users we follow that are active and not expired
            {
                $match: {
                    $expr: {
                        $and: [
                            { $in: ["$user", "$followData.following"] },
                            { $eq: ["$isActive", true] },
                            { $gt: ["$expiresAt", new Date()] },
                        ],
                    },
                },
            },
            // Lookup user details
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                profilePic: 1,
                            },
                        },
                    ],
                },
            },
            { $unwind: "$user" },
            // Add viewed field
            {
                $addFields: {
                    viewed: {
                        $in: [new mongoose.Types.ObjectId(req.user._id), "$views"],
                    },
                },
            },
            // Sort by creation date
            { $sort: { createdAt: -1 } },
            // Group by user to organize stories
            {
                $group: {
                    _id: "$user._id",
                    user: { $first: "$user" },
                    stories: {
                        $push: {
                            _id: "$_id",
                            content: "$content",
                            mediaUrl: "$mediaUrl",
                            mediaType: "$mediaType",
                            textBoxes: "$textBoxes",
                            drawings: "$drawings",
                            cropData: "$cropData",
                            viewCount: "$viewCount",
                            viewed: "$viewed",
                            createdAt: "$createdAt",
                        },
                    },
                },
            },
            // Limit to most recent 15 users with stories
            { $limit: 15 },
        ])

        res.json(stories)
    } catch (error) {
        console.error("Error fetching stories feed:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
})

// @route   GET /api/stories/user/:userId
// @desc    Get stories by specific user
// @access  Private
router.get("/user/:userId", auth, async (req, res) => {
    try {
        const userId = req.params.userId
        if (!userId) return res.status(400).json({ message: "Missing required parameters" })

        // Validate ObjectId format
        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid user ID format" })
        }

        if (!isValidObjectId(req.user._id)) {
            return res.status(400).json({ message: "Invalid authenticated user ID" })
        }

        // Check for blocks between story viewer and creator
        const blockExists = await checkBlockExistance(req.user._id, userId)
        if (blockExists) return res.status(403).send("Cannot view stories due to block")

        console.log(userId + "  seddesw")

        const stories = await Story.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    isActive: true,
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                profilePic: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$user",
            },
            {
                $addFields: {
                    viewed: {
                        $in: [new mongoose.Types.ObjectId(req.user._id), "$views"],
                    },
                },
            },
            {
                $sort: { createdAt: 1 },
            },
        ])

        res.json(stories)
    } catch (error) {
        console.error("Error fetching user stories:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
})

// @route   POST /api/stories/:storyId/view
// @desc    Mark a story as viewed by the current user
// @access  Private
router.post("/:storyId/view", auth, async (req, res) => {
    try {
        const storyId = req.params.storyId

        // Validate ObjectId format
        if (!isValidObjectId(storyId)) {
            return res.status(400).json({ message: "Invalid story ID format" })
        }

        if (!isValidObjectId(req.user._id)) {
            return res.status(400).json({ message: "Invalid authenticated user ID" })
        }

        const story = await Story.findById(storyId)

        if (!story) {
            return res.status(404).json({ message: "Story not found" })
        }

        // Check for blocks between viewer and story creator
        const blockExists = await checkBlockExistance(req.user._id, story.user)
        if (blockExists) return res.status(403).send("Cannot view story due to block")

        // Check if user has already viewed this story
        const hasViewed = story.views.some((view) => view.toString() === req.user._id.toString())

        if (!hasViewed) {
            // Add view to the story
            story.views.push(req.user._id)
            story.viewCount += 1

            await story.save()
        }

        res.json({ message: "Story viewed successfully", viewCount: story.viewCount })
    } catch (error) {
        console.error("Error marking story as viewed:", error)
        res.status(500).json({ message: "Server error" })
    }
})

router.get("/views/:storyid", auth, async (req, res) => {
    const storyId = req.params.storyid
    if (!storyId) return res.status(400).json({ message: "Missing required parameters" })

    const story = await Story.findOne({ _id: storyId })
    if (!story) return res.status(404).send("Story not found")

    // Check for blocks between viewer and story creator
    const blockExists = await checkBlockExistance(req.user._id, story.user)
    if (blockExists)
        return res
            .status(403)
            .send("Cannot view story details due to block")
            .populate({ path: "views", select: "username profilePic" })
            .select("views")
    if (!story) return res.status(404).send("Story not found")

    const views = story?.views || []
    res.send(views)
})

router.delete("/:storyId", auth, async (req, res) => {
    const storyId = req.params.storyId
    if (!storyId) return res.status(400).json({ message: "Missing required parameters" })

    const story = await Story.findOneAndDelete({ _id: storyId, user: req.user._id })
    if (!story) return res.status(400).send("Could not delete story")

    res.send("Deleted")
})

// Custom auth middleware for media streaming that supports both header and query token
const mediaAuth = (req, res, next) => {
    console.log("MediaAuth - Request URL:", req.url)
    console.log("MediaAuth - Query params:", req.query)
    console.log("MediaAuth - Headers x-auth-token:", req.header("x-auth-token"))

    // Try to get token from header first, then from query parameter
    let accessToken = req.header("x-auth-token") || req.query.token

    console.log("MediaAuth - Token found:", !!accessToken)
    console.log(
        "MediaAuth - Token source:",
        req.header("x-auth-token") ? "header" : req.query.token ? "query" : "none"
    )

    if (!accessToken) {
        console.log("MediaAuth - No access token provided")
        return res.status(401).json({ message: "Access token required" })
    }

    try {
        const decoded = jwt.verify(accessToken, config.get("ACCESS_PRIVATE_KEY"))

        // Validate that the decoded token contains a valid user ID
        if (!decoded._id || !mongoose.Types.ObjectId.isValid(decoded._id)) {
            console.log("MediaAuth - Invalid user ID in token")
            return res.status(401).json({ message: "Invalid token: user ID is not valid" })
        }

        console.log("MediaAuth - Authentication successful for user:", decoded._id)
        req.user = decoded
        next()
    } catch (err) {
        console.log("MediaAuth - Token verification failed:", err.message)
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}

// @route   GET /api/stories/media/:filename
// @desc    Stream media files with authentication
// @access  Private
router.get("/media/:filename", mediaAuth, async (req, res) => {
    try {
        const filename = req.params.filename
        if (!filename) {
            return res.status(400).json({ message: "Filename is required" })
        }

        // Construct the file path
        const filePath = path.join(__dirname, "../uploads/stories", filename)

        console.log("Media streaming - filename:", filename)
        console.log("Media streaming - filePath:", filePath)

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log("Media streaming - File not found:", filePath)
            return res.status(404).json({ message: "File not found" })
        }

        // Get file stats
        const stat = fs.statSync(filePath)
        const fileSize = stat.size

        console.log("Media streaming - fileSize:", fileSize)

        if (fileSize === 0) {
            console.log("Media streaming - File is empty:", filePath)
            return res.status(404).json({ message: "File is empty" })
        }

        // Get file extension to determine content type
        const ext = path.extname(filename).toLowerCase()
        let contentType = "application/octet-stream"

        // Set appropriate content type
        const mimeTypes = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".ogg": "video/ogg",
            ".avi": "video/avi",
            ".mov": "video/quicktime",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }

        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext]
        }

        // Handle range requests for video streaming
        const range = req.headers.range

        if (range && contentType.startsWith("video/")) {
            // Parse range header
            const parts = range.replace(/bytes=/, "").split("-")
            const start = parseInt(parts[0], 10) || 0
            const end = parts[1] && parts[1] !== "" ? parseInt(parts[1], 10) : fileSize - 1
            const chunksize = end - start + 1

            console.log("Range request - parts:", parts)
            console.log("Range request - start:", start, "end:", end, "fileSize:", fileSize)

            // Validate range values
            if (start >= fileSize || end >= fileSize || start > end) {
                return res.status(416).json({ message: "Range not satisfiable" })
            }

            // Create read stream for the requested range
            const file = fs.createReadStream(filePath, { start, end })

            // Set appropriate headers for partial content
            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize,
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
            })

            file.pipe(res)
        } else {
            // For images or full video requests
            res.writeHead(200, {
                "Content-Length": fileSize,
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
                "Accept-Ranges": "bytes",
            })

            fs.createReadStream(filePath).pipe(res)
        }
    } catch (error) {
        console.error("Error streaming media:", error)
        res.status(500).json({ message: "Server error", error: error.message })
    }
})

module.exports = router
