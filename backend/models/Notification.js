const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
    {
        type: { type: String, required: true },
        from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        references: {
            type: [
                {
                    modelRef: { type: String, enum: ["Post", "Comment"] },
                    data: { type: mongoose.Schema.Types.ObjectId, refPath: "references.modelRef" },
                },
            ],
            default: [],
        },
    },
    { timestamps: true }
)

const Notification = mongoose.model("Notification", notificationSchema)

module.exports = {
    Notification,
}
