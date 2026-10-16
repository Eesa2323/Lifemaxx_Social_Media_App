const mongoose = require("mongoose")
const { v4: uuid } = require("uuid")
const path = require("path")

const messageSchema = new mongoose.Schema(
    {
        messageText: { type: String, maxLength: 1000 },
        referencedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fileName: { type: String },
        reply: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
        isAdmin: { type: Boolean, default: false },
        journeyPost: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
        sharedCommunity: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
        sharedStory: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
        sharedPost: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    },
    { timestamps: true }
)

const Message = mongoose.model("Message", messageSchema)

async function createMessage(
    senderId,
    chatId,
    messageText,
    isGroupChat,
    reply = null,
    file = null,
    adminData = null,
    journeyPost = null
) {
    const populateOptions = []
    const fileName = !file ? "" : `${uuid()}${path.extname(file.name)}`
    if (file) {
        const filePath = path.join(__dirname, "../uploads/messages/", fileName)
        await file.mv(filePath)
    }

    const message = await Message.create({
        sender: senderId,
        chat: chatId,
        messageText,
        isAdmin: !!adminData,
        fileName,
        ...(reply && { reply }),
        ...(adminData?.referencedUsers && { referencedUsers: adminData.referencedUsers }),
        ...(journeyPost && { journeyPost }),
        ...(adminData?.communityId && { sharedCommunity: adminData.communityId }),
        ...(adminData?.storyId && { sharedStory: adminData.storyId }),
        ...(adminData?.postId && { sharedPost: adminData.postId }),
    })

    if (isGroupChat) {
        populateOptions.push(
            { path: "sender", select: "username profilePic" },
            { path: "referencedUsers", select: "username" }
        )
    }

    if (reply) {
        populateOptions.push({
            path: "reply",
            options: { populate: { path: "sender", select: "username profilePic" } },
            select: "messageText sender fileName",
        })
    }

    if (journeyPost) {
        populateOptions.push({
            path: "journeyPost",
            options: { populate: { path: "creator", select: "username profilePic" } },
            select: "caption url creator",
        })
    }

    if (adminData?.communityId) {
        populateOptions.push({
            path: "sharedCommunity",
            options: { populate: { path: "creator", select: "username profilePic" } },
            select: "name description category memberCount creator",
        })
    }

    if (adminData?.storyId) {
        populateOptions.push({
            path: "sharedStory",
            options: { populate: { path: "user", select: "username profilePic" } },
            select: "mediaUrl mediaType textBoxes drawings user createdAt",
        })
    }

    if (adminData?.postId) {
        populateOptions.push({
            path: "sharedPost",
            options: { populate: { path: "creator", select: "username profilePic" } },
            select: "caption url creator createdAt likes",
        })
    }

    if (populateOptions.length) await message.populate(populateOptions)
    return message
}

module.exports = { Message, createMessage }
