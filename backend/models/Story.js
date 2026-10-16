const mongoose = require("mongoose")

const textBoxSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true },
        content: { type: String, required: true },
        position: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
        },
    },
    { _id: false }
)

const drawingPathSchema = new mongoose.Schema(
    {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
    },
    { _id: false }
)

const drawingSchema = new mongoose.Schema(
    {
        path: [drawingPathSchema],
        color: { type: String, required: true },
    },
    { _id: false }
)

const cropDataSchema = new mongoose.Schema(
    {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        zoom: { type: Number, required: true },
    },
    { _id: false }
)

const storySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            default: "",
        },
        mediaUrl: {
            type: String,
            default: "",
        },
        mediaType: {
            type: String,
            enum: ["image", "video", ""],
            default: "",
        },
        textBoxes: [textBoxSchema],
        drawings: [drawingSchema],
        cropData: cropDataSchema,
        isActive: {
            type: Boolean,
            default: true,
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        },
        views: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        viewCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
)

// Index for automatic deletion of expired stories
storySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 })

// Index for efficient querying
storySchema.index({ user: 1, isActive: 1, createdAt: -1 })

const Story = mongoose.model("Story", storySchema)

module.exports = Story
