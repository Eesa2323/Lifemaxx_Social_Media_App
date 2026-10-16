const mongoose = require("mongoose")

const followSchema = new mongoose.Schema(
    {
        follower: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        following: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
)

const requestSchema = new mongoose.Schema(
    {
        requester: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        requested: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
)

followSchema.index({ follower: 1, following: 1 }, { unique: true })
requestSchema.index({ requester: 1, requested: 1 }, { unique: true })

const Follow = mongoose.model("Follow", followSchema)
const Request = mongoose.model("Request", requestSchema)

module.exports = {
    Follow,
    Request,
}
