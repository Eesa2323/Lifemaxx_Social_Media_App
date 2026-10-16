const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const error = require("../middleware/error")
const auth = require("../routes/auth")
const journeys = require("../routes/journeys")
const { router: posts } = require("../routes/posts")
const chats = require("../routes/chats")
const users = require("../routes/users")
const ably = require("../routes/ably")
const notifications = require("../routes/notifications")
const communities = require("../routes/communities")
const startups = require("../routes/startups")
const { router: messages } = require("../routes/messages")
const path = require("path")
const discovers = require("../routes/discovers")
const stories = require("../routes/stories")

module.exports = (app) => {
    app.use(express.urlencoded({ extended: true }))
    app.use(express.json())
    // Custom middleware to handle video files with proper headers
    app.use("/uploads", (req, res, next) => {
        const filePath = req.path.toLowerCase()

        // Set video content types based on file extension
        if (filePath.endsWith(".mp4")) {
            res.set("Content-Type", "video/mp4")
        } else if (filePath.endsWith(".webm")) {
            res.set("Content-Type", "video/webm")
        } else if (filePath.endsWith(".ogg")) {
            res.set("Content-Type", "video/ogg")
        }

        // Add CORS headers specifically for media files
        res.set("Access-Control-Allow-Origin", "*")
        res.set("Access-Control-Allow-Methods", "GET")
        res.set("Access-Control-Allow-Headers", "Content-Type, Range")
        res.set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")

        // Enable range requests (important for video streaming)
        res.set("Accept-Ranges", "bytes")

        // Set proper disposition
        res.set("Content-Disposition", "inline")

        next()
    })

    app.use(
        "/uploads",
        express.static(path.join(__dirname, "../uploads"), {
            maxAge: 120000,
            setHeaders: (res, filePath) => {
                // Additional headers for static files
                if (
                    filePath.endsWith(".mp4") ||
                    filePath.endsWith(".webm") ||
                    filePath.endsWith(".ogg")
                ) {
                    // Cache control for video files - allow caching but require revalidation
                    res.set("Cache-Control", "public, max-age=3600, must-revalidate")
                }
            },
        })
    )
    app.use(cookieParser())
    app.use(
        cors({
            credentials: true,
            origin: true,
            exposedHeaders: ["x-auth-token"],
        })
    )
    app.use("/api/auth", auth)
    app.use("/api/journeys", journeys)
    app.use("/api/posts", posts)
    app.use("/api/chats", chats)
    app.use("/api/users", users)
    app.use("/api/ably", ably)
    app.use("/api/messages", messages)
    app.use("/api/notifications", notifications)
    app.use("/api/communities", communities), app.use("/api/startups", startups)
    app.use("/api/discovers", discovers)
    app.use("/api/stories", stories)
    app.use(error)
}
