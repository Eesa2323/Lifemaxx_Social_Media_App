const mongoose = require("mongoose")

const startupSchema = new mongoose.Schema(
    {
        title: { type: String, min: 1, maxLength: 2000, required: true },
        description: { type: String, min: 1, maxLength: 2000, required: true },
        creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        keywords: [{ type: String }],
    },
    { timestamps: true }
)

const Startup = mongoose.model("Startup", startupSchema)

module.exports = {
    Startup,
}
