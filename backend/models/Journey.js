const mongoose = require("mongoose")

const journeySchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        url: { type: String, default: "" },

        creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        tags: [{ type: String }],
        status: { type: Boolean, required: true, default: false },
    },
    { timestamps: true }
)

const Journey = mongoose.model("Journey", journeySchema)

module.exports = {
    Journey,
}
