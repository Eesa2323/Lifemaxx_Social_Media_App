const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const { Chat, generateChatResponse, ChatRead } = require("../models/Chat")
const { User, Blocks } = require("../models/User")
const { createMessage } = require("../models/Message")
const { save, saveAndEmitMessage } = require("./messages")
const Joi = require("joi")
const mongoose = require("mongoose")
const { checkBlockExistance } = require("../utils/helper")
const fileUpload = require("express-fileupload")
const { validateEditChatDetails } = require("../middleware/validation")
const { v4: uuid } = require("uuid")
const path = require("path")

const CHAT_PROFILE_PIC_UPLOAD_CONFIG = {
    limits: { files: 1, fileSize: 1024 * 1024 * 10 },
    abortOnLimit: true,
}

router.get("/unread", auth, async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user._id)
    const unreadChats = await Chat.aggregate([
        { $match: { users: userId } },
        {
            $lookup: {
                from: "chatreads",
                let: { cid: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [{ $eq: ["$chatId", "$$cid"] }, { $eq: ["$userId", userId] }],
                            },
                        },
                    },
                    { $project: { lastReadTime: 1, _id: 0 } },
                ],
                as: "metaTimestamps",
            },
        },
        {
            $lookup: {
                from: "messages",
                localField: "latestMessage",
                foreignField: "_id",
                as: "latestMessage",
                pipeline: [{ $project: { createdAt: 1, sender: 1 } }],
            },
        },
        { $unwind: "$latestMessage" },
        // Lookup blocks to check if latest message sender is blocked (only for private chats)
        {
            $lookup: {
                from: "blocks",
                let: {
                    messageSender: "$latestMessage.sender",
                    isPrivateChat: { $ne: ["$privateChatKey", ""] },
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    "$$isPrivateChat",
                                    {
                                        $or: [
                                            {
                                                $and: [
                                                    { $eq: ["$blocker", userId] },
                                                    { $eq: ["$blocked", "$$messageSender"] },
                                                ],
                                            },
                                            {
                                                $and: [
                                                    { $eq: ["$blocker", "$$messageSender"] },
                                                    { $eq: ["$blocked", userId] },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                ],
                as: "senderBlocks",
            },
        },
        {
            $addFields: {
                lastReadTime: {
                    $ifNull: [{ $arrayElemAt: ["$metaTimestamps.lastReadTime", 0] }, new Date(0)],
                },
                isSenderBlocked: { $gt: [{ $size: "$senderBlocks" }, 0] },
            },
        },
        {
            $match: {
                $expr: {
                    $and: [
                        { $gt: ["$latestMessage.createdAt", "$lastReadTime"] },
                        { $ne: ["$latestMessage.sender", userId] },
                        { $eq: ["$isSenderBlocked", false] }, // Exclude if sender is blocked
                    ],
                },
            },
        },
        { $count: "unreadCount" },
    ])

    const count = unreadChats[0]?.unreadCount || 0
    res.send({ count })
})

router.get("/", auth, async (req, res) => {
    const CHAT_LIMIT = 30
    const userId = new mongoose.Types.ObjectId(req.user._id)

    const chats = await Chat.aggregate([
        { $match: { users: new mongoose.Types.ObjectId(req.user._id) } },
        {
            $lookup: {
                from: "chatreads",
                let: { cid: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [{ $eq: ["$chatId", "$$cid"] }, { $eq: ["$userId", userId] }],
                            },
                        },
                    },
                    { $project: { _id: 0, deletionTime: 1, lastReadTime: 1 } },
                ],
                as: "metaTimestamps",
            },
        },
        { $addFields: { metaTimestamps: { $arrayElemAt: ["$metaTimestamps", 0] } } },
        // Lookup blocks to find users that current user has blocked (only for private chats)
        {
            $lookup: {
                from: "blocks",
                let: {
                    chatUsers: "$users",
                    isPrivateChat: { $ne: ["$privateChatKey", ""] },
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    "$$isPrivateChat",
                                    { $eq: ["$blocker", userId] },
                                    { $in: ["$blocked", "$$chatUsers"] },
                                ],
                            },
                        },
                    },
                    {
                        $project: {
                            blocked: 1,
                            createdAt: 1,
                        },
                    },
                ],
                as: "blocks",
            },
        },
        // Get the default latest message first
        {
            $lookup: {
                from: "messages",
                let: { mid: "$latestMessage", dt: "$metaTimestamps.deletionTime" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$mid"] } } },
                    {
                        $match: {
                            $expr: {
                                $or: [{ $eq: ["$$dt", null] }, { $gt: ["$createdAt", "$$dt"] }],
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "sender",
                            foreignField: "_id",
                            as: "senderInfo",
                            pipeline: [{ $project: { username: 1, profilePic: 1 } }],
                        },
                    },
                    { $unwind: { path: "$senderInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "referencedUsers",
                            foreignField: "_id",
                            as: "referencedUsers",
                            pipeline: [{ $project: { username: 1, profilePic: 1 } }],
                        },
                    },
                    {
                        $project: {
                            messageText: 1,
                            isAdmin: 1,
                            referencedUsers: 1,
                            journeyPost: 1,
                            sharedCommunity: 1,
                            sharedStory: 1,
                            createdAt: 1,
                            chat: 1,
                            sender: "$senderInfo",
                        },
                    },
                ],
                as: "defaultLatestMessage",
            },
        },
        { $unwind: { path: "$defaultLatestMessage", preserveNullAndEmptyArrays: true } },
        // Find the latest valid message (before any blocks were created) only for private chats with blocks
        {
            $lookup: {
                from: "messages",
                let: {
                    chatId: "$_id",
                    dt: "$metaTimestamps.deletionTime",
                    blocks: "$blocks",
                    hasBlocks: { $gt: [{ $size: "$blocks" }, 0] },
                    isPrivateChat: { $ne: ["$privateChatKey", ""] },
                },
                pipeline: [
                    // Only proceed if this is a private chat with blocks
                    {
                        $match: {
                            $expr: {
                                $and: ["$$isPrivateChat", "$$hasBlocks"],
                            },
                        },
                    },
                    { $match: { $expr: { $eq: ["$chat", "$$chatId"] } } },
                    {
                        $match: {
                            $expr: {
                                $or: [{ $eq: ["$$dt", null] }, { $gt: ["$createdAt", "$$dt"] }],
                            },
                        },
                    },
                    // Add field to check if message sender is blocked and when
                    {
                        $addFields: {
                            senderBlockInfo: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: "$$blocks",
                                            cond: { $eq: ["$$this.blocked", "$sender"] },
                                        },
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                    // Filter out messages sent after the sender was blocked
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ["$senderBlockInfo", null] },
                                    { $lt: ["$createdAt", "$senderBlockInfo.createdAt"] },
                                ],
                            },
                        },
                    },
                    { $sort: { createdAt: -1 } },
                    { $limit: 1 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "sender",
                            foreignField: "_id",
                            as: "senderInfo",
                            pipeline: [{ $project: { username: 1, profilePic: 1 } }],
                        },
                    },
                    { $unwind: { path: "$senderInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "referencedUsers",
                            foreignField: "_id",
                            as: "referencedUsers",
                            pipeline: [{ $project: { username: 1, profilePic: 1 } }],
                        },
                    },
                    {
                        $project: {
                            messageText: 1,
                            isAdmin: 1,
                            referencedUsers: 1,
                            createdAt: 1,
                            chat: 1,
                            sender: "$senderInfo",
                        },
                    },
                ],
                as: "blockedFilteredMessage",
            },
        },
        { $unwind: { path: "$blockedFilteredMessage", preserveNullAndEmptyArrays: true } },
        // Choose which message to use for sorting: blocked-filtered for private chats with blocks, default otherwise
        {
            $addFields: {
                latestMessage: {
                    $cond: {
                        if: {
                            $and: [
                                { $ne: ["$privateChatKey", ""] }, // is private chat
                                { $gt: [{ $size: "$blocks" }, 0] }, // has blocks
                                { $ne: ["$blockedFilteredMessage", null] }, // found valid message before block
                            ],
                        },
                        then: "$blockedFilteredMessage",
                        else: "$defaultLatestMessage",
                    },
                },
            },
        },
        { $sort: { "latestMessage.createdAt": -1 } },
        { $limit: CHAT_LIMIT },
        {
            $lookup: {
                from: "users",
                localField: "users",
                foreignField: "_id",
                as: "users",
                pipeline: [{ $project: { username: 1, profilePic: 1 } }],
            },
        },
        // Clean up temporary fields
        {
            $project: {
                defaultLatestMessage: 0,
                blockedFilteredMessage: 0,
                blocks: 0,
            },
        },
    ])

    return res.send(chats)
})

router.get("/search/new/:query/:chatid", [auth], async (req, res) => {
    const { query, chatid: chatId } = req.params
    const userId = new mongoose.Types.ObjectId(req.user._id)
    if (!query || !chatId) {
        console.log("1")

        return res.status(400).send("No query/chat id provided")
    }

    await delay(6000)

    const chat = await Chat.findOne({ _id: chatId, users: userId })
    if (!chat) {
        return res.status(400).send("Cannot find chat")
    }

    // Get blocked users (both directions)
    const blockedUsers = await Blocks.find({
        $or: [{ blocker: userId }, { blocked: userId }],
    }).select("blocker blocked")

    const blockedUserIds = blockedUsers.map((block) =>
        block.blocker.equals(userId) ? block.blocked : block.blocker,
    )

    const pipeline = [
        {
            $match: {
                _id: {
                    $nin: [...chat.users, ...blockedUserIds],
                },
                username: {
                    $regex: new RegExp(query, "i"),
                },
            },
        },
        { $limit: 20 },
    ]

    const users = await User.aggregate(pipeline)
    res.send(users)
})

router.get("/search", auth, async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user._id)
    const q = req.query.q?.trim()

    if (!q) {
        // No search query: return group chats and private chats for the user (max 20)
        const chats = await Chat.find({ users: userId })
            .populate({ path: "users", select: "username profilePic" })
            .sort({ updatedAt: -1 })
            .limit(20)
            .select("_id chatTitle users privateChatKey chatPicture")
            .lean()
        return res.send({ chats, users: [] })
    }

    const regex = new RegExp(q, "i")

    // Get blocked users (both directions)
    const blockedUsers = await Blocks.find({
        $or: [{ blocker: userId }, { blocked: userId }],
    }).select("blocker blocked")

    const blockedUserIds = blockedUsers.map((block) =>
        block.blocker.equals(userId) ? block.blocked : block.blocker,
    )

    // Search for USERS FIRST (prioritize users over group chats)
    const users = await User.find({
        username: { $regex: regex },
        _id: {
            $ne: userId,
            $nin: blockedUserIds,
        }, // Exclude current user
    })
        .select("_id username profilePic")
        .limit(15) // Prioritize users - allow more users
        .lean()

    // Search for GROUP CHATS (where chatTitle matches or any user's username matches)
    const groupChats = await Chat.aggregate([
        {
            $match: {
                users: userId,
                $or: [
                    { privateChatKey: { $exists: false } },
                    { privateChatKey: "" },
                    { privateChatKey: null },
                ],
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "users",
                foreignField: "_id",
                as: "users",
                pipeline: [{ $project: { username: 1, profilePic: 1 } }],
            },
        },
        {
            $addFields: {
                // Filter out current user from users array for display
                filteredUsers: {
                    $filter: {
                        input: "$users",
                        cond: { $ne: ["$$this._id", userId] },
                    },
                },
                userMatch: {
                    $anyElementTrue: {
                        $map: {
                            input: "$users",
                            as: "u",
                            in: { $regexMatch: { input: "$$u.username", regex: q, options: "i" } },
                        },
                    },
                },
                titleMatch: {
                    $regexMatch: { input: { $ifNull: ["$chatTitle", ""] }, regex: q, options: "i" },
                },
            },
        },
        {
            $match: { $or: [{ userMatch: true }, { titleMatch: true }] },
        },
        {
            $project: {
                _id: 1,
                chatTitle: 1,
                users: "$filteredUsers", // Use filtered users (excluding current user)
                privateChatKey: 1,
                chatPicture: 1,
            },
        },
        { $limit: 10 }, // Fewer group chats since users are prioritized
    ])

    // Prioritize users: take up to 15 users, then fill remaining slots with group chats
    const totalResults = users.length + groupChats.length
    let finalUsers = users
    let finalChats = groupChats

    if (totalResults > 20) {
        // Prioritize users - take up to 15 users first
        const usersToTake = Math.min(users.length, 15)
        const chatsToTake = Math.min(groupChats.length, 20 - usersToTake)
        finalUsers = users.slice(0, usersToTake)
        finalChats = groupChats.slice(0, chatsToTake)
    }

    res.send({ users: finalUsers, chats: finalChats })
})

router.get("/:chatid", auth, async (req, res) => {
    const chatId = req.params.chatid
    const userId = req.user._id
    if (!chatId) return res.status(400).send("No chat id.")

    const metaTimestamps = await ChatRead.findOne({ chatId: chatId, userId: userId }).select(
        "-_id lastReadTime deletionTime",
    )

    const chat = await Chat.findOne({ _id: chatId, users: userId }).populate([
        {
            path: "latestMessage",
            select: "sender createdAt sharedStory sharedCommunity journeyPost isAdmin referencedUsers",
            populate: { path: "referencedUsers", select: "username profilePic" },
        },
        { path: "users", select: "username profilePic" },
    ])
    if (!chat || metaTimestamps?.deletionTime > chat.latestMessage?.createdAt)
        return res.status(400).send("Cannot access chat")

    const chatObj = {
        ...chat.toObject(),
        metaTimestamps: {
            lastReadTime: metaTimestamps?.lastReadTime,
            deletionTime: metaTimestamps?.deletionTime,
        },
    }
    return res.send(chatObj)
})

router.put("/update_chat_read_timestamp/:chatid", auth, async (req, res) => {
    const chatId = req.params.chatid
    const userId = req.user._id
    const ablyRest = req.app.get("ablyRest")
    if (!chatId) return res.status(400).send("No chat id.")

    const chat = await Chat.findOne({ _id: chatId, users: userId }).populate({
        path: "latestMessage",
        select: "sender createdAt",
    })

    if (!chat) return res.status(400).send("Chat not found")

    const latestMessage = chat.latestMessage

    // Check if this is a private chat and if there's a block between user and latest message sender
    if (chat.privateChatKey && latestMessage?.sender) {
        const blockExists = await checkBlockExistance(userId, latestMessage.sender)
        if (blockExists) {
            return res.status(400).send("Cannot update read timestamp for blocked user")
        }
    }

    const metaTimestamps = await ChatRead.findOne({ chatId: chatId, userId: userId })
    const timestamp = new Date()

    if (metaTimestamps?.lastReadTime >= latestMessage?.createdAt) {
        return res.status(400).send("Cannot update chat timestamp")
    } else if (!metaTimestamps) {
        await ChatRead.create({ chatId: chatId, userId: userId, lastReadTime: timestamp })
    } else {
        await ChatRead.updateOne(
            { chatId: chatId, userId: userId },
            { $set: { lastReadTime: timestamp } },
        )
    }

    const readUserData = { _id: userId, username: req.user.username }
    const data = { readUserData, chatId, timestamp }
    if (latestMessage?.sender) {
        console.log(latestMessage.sender)

        ablyRest.channels
            .get(`messages:${latestMessage.sender.toString()}`)
            .publish("messageSeen", data)
    }

    res.send("Chat timestamp updated")
})

router.post("/", auth, async (req, res) => {
    const { participants } = req.body
    const ablyRest = req.app.get("ablyRest")

    // const chatValidationResult = validateChatParticipants(participants, userId, true, 2)
    // if (chatValidationResult.error) return res.status(400).send("Could not create chat")

    const isGroupChat = participants.length > 2
    const sortedChatParticipantIds = !isGroupChat && participants.sort()

    // Check for blocks in both private and group chats
    const userId = req.user._id
    const blocks = await Blocks.find({
        $or: [
            { blocker: userId, blocked: { $in: participants } },
            { blocker: { $in: participants }, blocked: userId },
        ],
    })

    if (blocks.length > 0) {
        return res.status(400).send("Cannot create chat with blocked users")
    }

    let chat
    let adminMessage
    if (!isGroupChat) chat = await findExistingPrivateChat(sortedChatParticipantIds)

    if (!chat) {
        chat = new Chat({
            users: participants,
            privateChatKey: !isGroupChat
                ? `${sortedChatParticipantIds[0]}-${sortedChatParticipantIds[1]}`
                : "",
        })

        if (isGroupChat) {
            adminMessage = await createMessage(
                req.user._id,
                chat._id,
                "created a group",
                true,
                null,
                null,
                true,
            )
            chat.latestMessage = adminMessage._id
        }

        await chat.save()

        // Create ChatRead doc for each participant
        await ChatRead.bulkWrite(
            participants.map((userId) => ({
                insertOne: {
                    document: { userId, chatId: chat._id, lastReadTime: new Date() },
                },
            })),
        )
    }

    await chat.populate({ path: "users", select: "username profilePic" })
    const chatData = generateChatResponse(chat, adminMessage)

    if (isGroupChat && adminMessage) {
        const data = { message: adminMessage, senderId: req.user._id }
        chat.users.forEach((u) => {
            ablyRest.channels.get(`messages:${u._id.toString()}`).publish("newMessage", data)
        })
    }

    res.send(chatData)
})

router.post("/add_participants/:chatid", auth, async (req, res) => {
    const chatId = req.params.chatid
    const chatParticipantIds = req.body.chatParticipantIds
    const ablyRest = req.app.get("ablyRest")
    const userId = req.user._id
    if (!chatId || !chatParticipantIds)
        return res.status(400).send("No Chat Id or participants provided")

    // Check for blocks between any of the participants and the current user
    const blocks = await Blocks.find({
        $or: [
            { blocker: userId, blocked: { $in: chatParticipantIds } },
            { blocker: { $in: chatParticipantIds }, blocked: userId },
        ],
    })

    if (blocks.length > 0) {
        return res.status(403).send("Cannot add blocked users to chat")
    }

    const chat = await Chat.findOneAndUpdate(
        {
            _id: chatId,
            users: { $in: [userId], $nin: chatParticipantIds },
            "users.249": { $exists: false },
            privateChatKey: { $eq: "" },
        },
        { $push: { users: { $each: chatParticipantIds } } },
        { new: true },
    )
    if (!chat) return res.status(400).send("Could not add participants")

    const messageText = `added ^ to the chat`
    const message = await createMessage(userId, chatId, messageText, true, null, null, {
        referencedUsers: chatParticipantIds,
    })
    saveAndEmitMessage(ablyRest, userId, chat, message)

    return res.send({ message })
})

router.put("/leave_chat/:chatid", [auth], async (req, res) => {
    const userId = req.user._id
    const chatId = req.params.chatid
    const ablyClient = req.app.get("ablyRest")
    if (!chatId) return res.status(400).send("No chat id provided")

    const chat = await Chat.findOneAndUpdate(
        { _id: chatId, users: userId, privateChatKey: "" },
        { $pull: { users: userId } },
        { new: true },
    )
    if (!chat) return res.status(400).send("Could not leave chat")

    await ChatRead.deleteOne({ userId, chatId: chat._id })

    const chatDeletion = await Chat.deleteOne({ _id: chatId, users: { $size: 0 } })
    if (!chatDeletion.deletedCount) {
        const messageText = "left the chat"
        const message = await createMessage(userId, chatId, messageText, true, null, null, true)

        saveAndEmitMessage(ablyClient, userId, chat, message)
    }

    res.send({ chatId: chat._id, userId })
})

router.put(
    "/edit/:chatid",
    [auth, fileUpload(CHAT_PROFILE_PIC_UPLOAD_CONFIG), validateEditChatDetails],
    async (req, res) => {
        console.log("ghit")

        const userId = req.user._id
        const chatId = req.params.chatid
        const chatPicture = req.files && req.files?.file
        const chatTitle = req.body?.chatTitle
        const ablyRest = req.app.get("ablyRest")
        const updatedDetails = {}

        const chat = await Chat.findOne({ _id: chatId, users: userId, privateChatKey: "" })
        if (!chat) return res.status(400).send("Cannot update chat")

        if (chatPicture) {
            const fileName = `${uuid()}${path.extname(chatPicture.name)}`
            const filePath = path.join(__dirname, "../uploads/profilePics/", fileName)

            await chatPicture.mv(filePath)
            await chat.updateOne({ $set: { chatPicture: fileName } })

            updatedDetails.chatPicture = fileName
        } else {
            updatedDetails.chatTitle = chatTitle
            await chat.updateOne({ $set: { chatTitle: chatTitle } })
        }

        const messageText = chatPicture ? "updated the group image" : `named the group ${chatTitle}`
        const message = await createMessage(userId, chat._id, messageText, true, null, null, true)

        const meta = { updatedChatDetails: updatedDetails }
        saveAndEmitMessage(ablyRest, userId, chat, message, meta)

        return res.status(200).send({ updatedDetails, message })
    },
)

router.put("/delete_chat/:chatid", [auth], async (req, res) => {
    const userId = req.user._id
    const chatId = req.params.chatid
    if (!chatId) return res.status(400).send("No chat id provided")

    const up = await ChatRead.updateOne({ chatId, userId }, { $set: { deletionTime: new Date() } })
    if (!up.modifiedCount) return res.status(400).send("Could not delete chat")

    reviewChatDeletion(chatId)
    res.send({ chatId })
})

function validateChatParticipants(
    chatParticipantIds,
    userId,
    userIdInclusive = false,
    minLength = 1,
    maxLength = 250,
) {
    let schema = Joi.array().items(Joi.string()).unique().min(minLength).max(maxLength).required()
    if (userIdInclusive) schema = schema.has(Joi.valid(userId))

    return schema.validate(chatParticipantIds)
}

async function findExistingPrivateChat(chatParticipantIds) {
    if (!chatParticipantIds) return
    const key = `${chatParticipantIds[0]}-${chatParticipantIds[1]}`

    const chat = await Chat.findOne({ privateChatKey: key })
    return chat
}

async function reviewChatDeletion(chatId) {
    const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(chatId) } },
        {
            $lookup: {
                from: "chatreads",
                let: { id: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$chatId", "$$id"] } } },
                    { $project: { _id: 0, deletionTime: 1 } },
                ],
                as: "reads",
            },
        },
        {
            $lookup: {
                from: "messages",
                localField: "latestMessage",
                foreignField: "_id",
                as: "latestMessage",
                pipeline: [{ $project: { createdAt: 1 } }],
            },
        },
        { $unwind: "$latestMessage" },
        {
            $match: {
                $expr: {
                    $and: [
                        { $eq: [{ $size: "$reads" }, { $size: "$users" }] },
                        {
                            $allElementsTrue: {
                                $map: {
                                    input: "$reads",
                                    as: "r",
                                    in: { $gt: ["$$r.deletionTime", "$latestMessage.createdAt"] },
                                },
                            },
                        },
                    ],
                },
            },
        },
    ]

    const chat = await Chat.aggregate(pipeline)
    if (!chat[0]) return

    await Chat.deleteOne({ _id: chat[0]._id })
    await ChatRead.deleteMany({ chatId: chat[0]._id })
}

module.exports = router
