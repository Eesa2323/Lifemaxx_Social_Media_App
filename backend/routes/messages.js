const { Message, createMessage } = require("../models/Message")
const { Chat, generateChatResponse, ChatRead } = require("../models/Chat")
const { Blocks } = require("../models/User")
const auth = require("../middleware/auth")
const express = require("express")
const router = express.Router()
const fileUpload = require("express-fileupload")
const { validateMessageCreation } = require("../middleware/validation")
const { v4: uuid } = require("uuid")
const path = require("path")
const fs = require("fs")
const { delay, checkBlockExistance } = require("../utils/helper")

const MESSAGE_FILE_UPLOAD_CONFIG = {
    limits: { files: 1, fileSize: 1024 * 1024 * 32 },
    abortOnLimit: true,
}

// New route for sharing communities
router.post("/share-community", auth, async (req, res) => {
    const userId = req.user._id
    const { chatId, userId: targetUserId, communityId } = req.body
    const ablyRest = req.app.get("ablyRest")

    if (!communityId) {
        return res.status(400).send("Community ID is required")
    }

    let chat
    let isNewChat = false

    if (chatId) {
        // If chatId is provided, use existing chat
        chat = await Chat.findOne({ _id: chatId, users: userId })
        if (!chat) {
            return res.status(400).send("Cannot access chat")
        }
    } else if (targetUserId) {
        // If targetUserId is provided, find or create private chat
        const participants = [userId, targetUserId].sort()
        const privateChatKey = `${participants[0]}-${participants[1]}`

        // Check if private chat already exists
        chat = await Chat.findOne({ privateChatKey })

        if (!chat) {
            // Check for blocks before creating new private chat
            const existingBlock = await checkBlockExistance(userId, targetUserId)
            if (existingBlock) {
                return res.status(400).send("Cannot create chat with this user")
            }

            // Create new private chat
            chat = new Chat({
                users: participants,
                privateChatKey,
            })
            await chat.save()
            isNewChat = true
        } else {
            // Check if user is part of the chat
            if (!chat.users.includes(userId)) {
                return res.status(400).send("Cannot access chat")
            }
        }
    } else {
        return res.status(400).send("Either chatId or userId must be provided")
    }

    // Check for blocks in private chats
    const isGroupChat = chat.privateChatKey === ""
    if (!isGroupChat) {
        const otherUserId = chat.users.find((id) => id.toString() !== userId.toString())
        const existingBlock = await checkBlockExistance(userId, otherUserId)
        if (existingBlock) {
            return res.status(400).send("Cannot send message to this user")
        }
    }

    // Create message with community reference
    const messageText = "shared a community"

    // For community sharing, we'll use the adminData parameter to pass community info
    const adminData = {
        communityId: communityId,
        type: "community_share",
    }

    const message = await createMessage(
        userId,
        chat._id,
        messageText,
        isGroupChat,
        null,
        null,
        adminData
    )

    const emittedMessage = await saveAndEmitMessage(ablyRest, userId, chat, message)
    if (!emittedMessage) {
        return res.status(400).send("Could not send message")
    }

    // Populate chat data for response
    await chat.populate({ path: "users", select: "username profilePic" })
    const chatData = generateChatResponse(chat)

    res.send({
        message,
        chat: chatData,
        isNewChat,
    })
})

// New route for sharing posts
router.post("/share-post", auth, async (req, res) => {
    const userId = req.user._id
    const { chatId, userId: targetUserId, postId } = req.body
    const ablyRest = req.app.get("ablyRest")

    if (!postId) {
        return res.status(400).send("Post ID is required")
    }

    let chat
    let isNewChat = false

    if (chatId) {
        // If chatId is provided, use existing chat
        chat = await Chat.findOne({ _id: chatId, users: userId })
        if (!chat) {
            return res.status(400).send("Cannot access chat")
        }
    } else if (targetUserId) {
        // If targetUserId is provided, find or create private chat
        const participants = [userId, targetUserId].sort()
        const privateChatKey = `${participants[0]}-${participants[1]}`

        // Check if private chat already exists
        chat = await Chat.findOne({ privateChatKey })

        if (!chat) {
            // Check for blocks before creating new private chat
            const existingBlock = await checkBlockExistance(userId, targetUserId)
            if (existingBlock) {
                return res.status(400).send("Cannot create chat with this user")
            }

            // Create new private chat
            chat = new Chat({
                users: participants,
                privateChatKey,
            })
            await chat.save()
            isNewChat = true
        } else {
            // Check if user is part of the chat
            if (!chat.users.includes(userId)) {
                return res.status(400).send("Cannot access chat")
            }
        }
    } else {
        return res.status(400).send("Either chatId or userId must be provided")
    }

    // Check for blocks in private chats
    const isGroupChat = chat.privateChatKey === ""
    if (!isGroupChat) {
        const otherUserId = chat.users.find((id) => id.toString() !== userId.toString())
        const existingBlock = await checkBlockExistance(userId, otherUserId)
        if (existingBlock) {
            return res.status(400).send("Cannot send message to this user")
        }
    }

    // Create message with post reference
    const messageText = "shared a post"

    // For post sharing, we'll use the adminData parameter to pass post info
    const adminData = {
        postId: postId,
        type: "post_share",
    }

    const message = await createMessage(
        userId,
        chat._id,
        messageText,
        isGroupChat,
        null,
        null,
        adminData
    )

    const emittedMessage = await saveAndEmitMessage(ablyRest, userId, chat, message)
    if (!emittedMessage) {
        return res.status(400).send("Could not send message")
    }

    // Populate chat data for response
    await chat.populate({ path: "users", select: "username profilePic" })
    const chatData = generateChatResponse(chat)

    res.send({
        message,
        chat: chatData,
        isNewChat,
    })
})

// New route for sharing stories
router.post("/share-story", auth, async (req, res) => {
    const userId = req.user._id
    const { chatId, userId: targetUserId, storyId } = req.body
    const ablyRest = req.app.get("ablyRest")

    if (!storyId) {
        return res.status(400).send("Story ID is required")
    }

    let chat
    let isNewChat = false

    if (chatId) {
        // If chatId is provided, use existing chat
        chat = await Chat.findOne({ _id: chatId, users: userId })
        if (!chat) {
            return res.status(400).send("Cannot access chat")
        }
    } else if (targetUserId) {
        // If targetUserId is provided, find or create private chat
        const participants = [userId, targetUserId].sort()
        const privateChatKey = `${participants[0]}-${participants[1]}`

        // Check if private chat already exists
        chat = await Chat.findOne({ privateChatKey })

        if (!chat) {
            // Check for blocks before creating new private chat
            const existingBlock = await checkBlockExistance(userId, targetUserId)
            if (existingBlock) {
                return res.status(400).send("Cannot create chat with this user")
            }

            // Create new private chat
            chat = new Chat({
                users: participants,
                privateChatKey,
            })
            await chat.save()
            isNewChat = true
        } else {
            // Check if user is part of the chat
            if (!chat.users.includes(userId)) {
                return res.status(400).send("Cannot access chat")
            }
        }
    } else {
        return res.status(400).send("Either chatId or userId must be provided")
    }

    // Check for blocks in private chats
    const isGroupChat = chat.privateChatKey === ""
    if (!isGroupChat) {
        const otherUserId = chat.users.find((id) => id.toString() !== userId.toString())
        const existingBlock = await checkBlockExistance(userId, otherUserId)
        if (existingBlock) {
            return res.status(400).send("Cannot send message to this user")
        }
    }

    // Create message with story reference
    const messageText = "shared a story"

    // For story sharing, we'll use the adminData parameter to pass story info
    const adminData = {
        storyId: storyId,
        type: "story_share",
    }

    const message = await createMessage(
        userId,
        chat._id,
        messageText,
        isGroupChat,
        null,
        null,
        adminData
    )

    const emittedMessage = await saveAndEmitMessage(ablyRest, userId, chat, message)
    if (!emittedMessage) {
        return res.status(400).send("Could not send message")
    }

    // Populate chat data for response
    await chat.populate({ path: "users", select: "username profilePic" })
    const chatData = generateChatResponse(chat)

    res.send({
        message,
        chat: chatData,
        isNewChat,
    })
})

router.post(
    "/:chatid",
    [auth, fileUpload(MESSAGE_FILE_UPLOAD_CONFIG), validateMessageCreation],
    async (req, res) => {
        const userId = req.user._id
        const chatId = req.params.chatid
        const file = req.files && req.files.file
        const { messageText, reply: replyId } = req.body
        const ablyRest = req.app.get("ablyRest")

        if (!chatId) return res.status(400).send("Cannot send message")

        const chat = await Chat.findOne({ _id: chatId, users: userId })
        if (!chat) return res.status(400).send("Cannot send message")

        let reply
        if (replyId) {
            const message = await Message.findOne({ _id: replyId, chat: chatId }).select(
                "_id isAdmin"
            )
            if (!message || message.isAdmin) return res.status(400).send("Could not send message ")

            reply = message._id
        }

        const isGroupChat = chat.privateChatKey === ""
        let isBlocked

        // Check for blocks in private chats
        if (!isGroupChat) {
            const otherUserId = chat.users.find((id) => id.toString() !== userId.toString())
            const existingBlock = await checkBlockExistance(userId, otherUserId)
            if (existingBlock) isBlocked = existingBlock
        }

        const message = await createMessage(userId, chat._id, messageText, isGroupChat, reply, file)

        const emittedMessage = await saveAndEmitMessage(
            ablyRest,
            userId,
            chat,
            message,
            null,
            isBlocked
        )
        if (!emittedMessage) return res.status(400).send("Could not send message")

        console.log("SENT MESSAGE")

        res.send(message)
    }
)

router.get("/:chatid/:timestamp", auth, async (req, res) => {
    const { chatid, timestamp } = req.params
    const userId = req.user._id
    const MESSAGE_LIMIT = 40
    const READ_LIMIT = 10

    console.log("timestamp: " + timestamp)

    if (!chatid || !timestamp) return res.status(400).send("Cannot fetch messages for this chat")

    const chat = await Chat.findOne({ _id: chatid, users: userId })
    if (!chat) return res.status(400).send("Could not find chat")

    // Handle block checking for private chats
    let blockCreationDate
    if (chat.privateChatKey) {
        const otherUserId = chat.users.find((id) => id.toString() !== userId.toString())
        const block = await Blocks.findOne({
            $or: [
                { blocker: userId, blocked: otherUserId },
                { blocker: otherUserId, blocked: userId },
            ],
        }).select("createdAt")

        if (block) {
            blockCreationDate = block.createdAt
        }
    }

    const populateOptions = [
        {
            path: "reply",
            options: { populate: { path: "sender", select: "username profilePic" } },
            select: "messageText sender fileName",
        },
        { path: "referencedUsers", select: "username" },
        {
            path: "journeyPost",
            options: { populate: { path: "creator", select: "username profilePic" } },
            select: "caption url creator",
        },
        {
            path: "sharedCommunity",
            options: { populate: { path: "creator", select: "username profilePic" } },
            select: "name description category memberCount creator",
        },
        {
            path: "sharedStory",
            options: { populate: { path: "user", select: "username profilePic" } },
            select: "mediaUrl mediaType textBoxes drawings user createdAt",
        },
        {
            path: "sharedPost",
            options: { populate: { path: "creator", select: "username profilePic" } },
            select: "caption url creator createdAt likes",
        },
        ...(chat.privateChatKey === "" ? [{ path: "sender", select: "username profilePic" }] : []),
    ]

    const readTimestamps = await ChatRead.findOne({ chatId: chatid, userId: userId })
    const deletionTime = readTimestamps?.deletionTime

    const dateCriteria = {
        $lte: timestamp,
        ...(deletionTime && { $gt: deletionTime }),
        ...(blockCreationDate && { $lt: blockCreationDate }),
    }
    const messages = await Message.find({ chat: chatid, createdAt: dateCriteria })
        .populate(populateOptions)
        .sort({ createdAt: -1 })
        .limit(MESSAGE_LIMIT + 1)

    const readUsers = await ChatRead.find({
        chatId: chatid,
        lastReadTime: { $gt: timestamp },
    })
        .sort({ lastReadTime: -1 })
        .limit(READ_LIMIT + 1)
        .populate("userId", "username")

    const hasMoreRead = readUsers.length > READ_LIMIT
    const displayed = readUsers
        .slice(0, READ_LIMIT)
        .map((r) => ({ _id: r.userId._id, username: r.userId.username }))
    const othersCount = hasMoreRead ? readUsers.length - READ_LIMIT : 0

    const hasMoreMessages = messages.length > MESSAGE_LIMIT
    const nextCursor = hasMoreMessages ? messages[messages.length - 1].createdAt : undefined
    const data = hasMoreMessages ? messages.slice(0, messages.length - 1) : messages

    const response = { messages: data.reverse(), readUsers: { displayed, othersCount }, nextCursor }
    res.send(response)
})

router.delete("/:messageid/:chatid", [auth], async (req, res) => {
    const { messageid: messageId, chatid: chatId } = req.params
    const userId = req.user._id
    const ablyRest = req.app.get("ablyRest")
    if (!messageId || !chatId) return res.status(400).send("Cannot Delete Message")

    const chat = await Chat.findOne({ _id: chatId, users: userId })
    if (!chat) return res.status(400).send("Cannot find chat")

    const deletedMessage = await Message.findOneAndDelete({
        _id: messageId,
        sender: userId,
        isAdmin: false,
    })
    if (!deletedMessage) return res.status(400).send("Cannot delete message")

    if (chat.latestMessage.toString() === deletedMessage._id.toString()) {
        const updatedLatestMessage = await Message.findOne({ chat: chat._id }).sort({
            createdAt: -1,
        })

        if (updatedLatestMessage) {
            await Chat.updateOne(
                { _id: chat._id, latestMessage: deletedMessage._id },
                {
                    $set: { latestMessage: updatedLatestMessage._id },
                }
            )
        }
    }

    if (deletedMessage.fileName) {
        fs.unlink(path.join(__dirname, `../uploads/messages/${deletedMessage.fileName}`), (err) => {
            if (err) console.log(err)
        })
    }

    // if (chat.privateChatKey) {
    //     const otherUserId = chat.users.find((id) => id.toString() !== userId)
    //     const existingBlock = await checkBlockExistance(userId, otherUserId)
    //     if (existingBlock) return res.send(data)
    // }

    const data = { deletedMessage, chatId: chat._id }

    // Emit to users, but skip blocked users in private chats
    for (const u of chat.users) {
        if (u._id.toString() == userId) continue

        // For private chats, check if the user has blocked the sender
        if (chat.privateChatKey !== "") {
            const isBlocked = await checkBlockExistance(userId, u._id)
            if (isBlocked) continue
        }

        ablyRest.channels.get(`messages:${u._id.toString()}`).publish("deletedMessage", data)
    }

    res.send(data)
})

async function saveAndEmitMessage(ablyRest, userId, chat, message, meta = null, isBlocked = false) {
    const updatedChat = await Chat.findOneAndUpdate(
        { _id: chat._id },
        { $set: { latestMessage: message._id } },
        { timestamps: true }
    ).populate([{ path: "latestMessage", select: "createdAt sender" }])
    if (!updatedChat) return

    const previousMessageData = {
        createdAt: updatedChat.latestMessage?.createdAt,
        sender: updatedChat.latestMessage?.sender,
    }
    const data = {
        previousMessageData,
        chatData: { chatId: chat._id, privateChatKey: chat.privateChatKey },
        message,
        senderId: userId,
        meta,
    }

    // Emit to users, but skip blocked users in private chats
    for (const u of chat.users) {
        if (u._id.toString() == userId) continue

        // For private chats, check if the user has blocked the sender
        if (chat.privateChatKey !== "") {
            const isBlocked = await checkBlockExistance(userId, u._id)
            if (isBlocked) continue
        }

        console.log("id: " + u._id.toString())
        ablyRest.channels.get(`messages:${u._id.toString()}`).publish("newMessage", data)
    }

    return message
}

module.exports = { router, saveAndEmitMessage }
