const mongoose = require("mongoose")

const chatSchema = new mongoose.Schema(
    {
        privateChatKey: { type: String, default: "" },
        users: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            validate: {
                validator: function (arr) {
                    return arr.length > 0 && arr.length <= 250
                },
                message: () => `Users array not valid length`,
            },
        },
        bTimestamps: { type: mongoose.Schema.Types.Mixed, default: {} },
        latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
        chatTitle: { type: String, maxLength: 100, default: "" },
        chatPicture: { type: String },
    },
    { timestamps: true, minimize: false }
)

const chatReadSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletionTime: { type: Date },
    lastReadTime: { type: Date },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
})

const suppressUpdatedAt = function () {
    if (this.getOptions().timestamps !== true) this.setOptions({ timestamps: false })
}

chatSchema.pre("updateOne", suppressUpdatedAt)
chatSchema.pre("findOneAndUpdate", suppressUpdatedAt)

const Chat = mongoose.model("Chat", chatSchema)
const ChatRead = mongoose.model("ChatRead", chatReadSchema)

function generateChatResponse(chat, latestMessage) {
    return {
        _id: chat._id,
        createdAt: chat.createdAt,
        privateChatKey: chat.privateChatKey,
        users: chat.users,
        metaTimestamps: chat.metaTimestamps,
        latestMessage: latestMessage ?? chat.latestMessage,
        chatTitle: chat.chatTitle,
        chatPicture: chat.chatPicture,
    }
}

module.exports = { Chat, ChatRead, generateChatResponse }
