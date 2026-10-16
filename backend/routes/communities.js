const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const { Community, CommunityMembership } = require("../models/Community")
const { Blocks } = require("../models/User")
const { validateCommunityCreation, validatePostCreation } = require("../middleware/validation")
const {
    getPaginatedResponse,
    delay,
    getPostsPipeline,
    getStoryLookupStage,
} = require("../utils/helper")
const unrequiredAuth = require("../middleware/unrequiredAuth")
const mongoose = require("mongoose")
const { uploadToLocal } = require("../utils/upload")
const { Post } = require("../models/Post")
const { POST_FILE_UPLOAD_CONFIG } = require("./posts")
const { processMentions } = require("../utils/mentionHelper")
const { Notification } = require("../models/Notification")

router.get("/members", [auth], async (req, res) => {
    const { communityid, cursor } = req.query
    const LIMIT = 20

    if (!communityid) return res.status(400).send({ message: "Community ID is required" })

    const query = {
        community: new mongoose.Types.ObjectId(communityid),
        ...(cursor && { createdAt: { $lt: new Date(cursor) } }),
    }

    const memberships = await CommunityMembership.find(query)
        .sort({ createdAt: -1 })
        .limit(LIMIT + 1)
        .populate({ path: "user", select: "username profilePic" })
        .lean()

    const hasNext = memberships.length > LIMIT
    const data = hasNext ? memberships.slice(0, -1) : memberships
    const nextCursor = hasNext ? memberships[LIMIT - 1].createdAt.toISOString() : undefined

    res.send({ data, nextCursor })
})

router.get("/posts", [unrequiredAuth], async (req, res) => {
    const LIMIT = 25
    const { cursor, id, sort } = req.query
    const userId = req.user ? new mongoose.Types.ObjectId(req.user._id) : null
    if (!id) return res.status(400).send({ message: "Community ID is required" })

    let blockedUserIds = []
    if (userId) {
        // Get both users who blocked me and users I blocked
        const blocks = await Blocks.find({
            $or: [{ blocker: userId }, { blocked: userId }],
        }).select("blocker blocked")

        blockedUserIds = blocks.map((block) =>
            block.blocker.equals(userId) ? block.blocked : block.blocker
        )
    }

    const matchStage = cursor
        ? {
              $match: {
                  createdAt: { $lt: new Date(cursor) },
                  community: new mongoose.Types.ObjectId(id),
                  ...(userId && {
                      creator: { $nin: blockedUserIds },
                  }),
              },
          }
        : {
              $match: {
                  community: new mongoose.Types.ObjectId(id),
                  ...(userId && {
                      creator: { $nin: blockedUserIds },
                  }),
              },
          }

    // Define sort stage based on query parameter
    const sortStage = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 }

    // Get base pipeline stages
    const pipeline = await getPostsPipeline(matchStage, userId, LIMIT)

    // Make sure pipeline is an array before continuing
    if (!Array.isArray(pipeline)) {
        return res.status(500).send({ message: "Error constructing pipeline" })
    } // Replace or add sort stage
    const sortIndex = pipeline.findIndex((stage) => stage.$sort)
    if (sortIndex !== -1) {
        pipeline[sortIndex] = { $sort: sortStage }
    } else {
        pipeline.splice(1, 0, { $sort: sortStage }) // Add after match stage
    }

    const posts = await Post.aggregate(pipeline)

    const hasNextPage = posts.length > LIMIT
    const data = hasNextPage ? posts.slice(0, -1) : posts

    res.send({
        data,
        nextCursor: hasNextPage ? posts[LIMIT - 1].createdAt.toISOString() : undefined,
    })
})

router.post("/", [auth, validateCommunityCreation], async (req, res) => {
    const { category, name, description } = req.body
    const userId = req.user._id

    console.log("helklo")

    const data = {
        name,
        description,
        creator: userId,
        ...(category && { category }),
        memberCount: 1,
    }
    const community = await Community.create(data)
    await CommunityMembership.create({
        community: community._id,
        user: userId,
    })

    res.send(community)
})

router.post(
    "/:communityid",
    [auth, POST_FILE_UPLOAD_CONFIG, validatePostCreation],
    async (req, res) => {
        const { communityid: communityId } = req.params
        const caption = req.body?.caption
        const userId = req.user._id
        const file = req.files?.file

        if (!communityId) return res.status(400).send("Cannot post to community, caption required.")

        const community = await CommunityMembership.exists({ user: userId, community: communityId })
        if (!community) return res.status(400).send("Could not add post to community")

        let mediaUrl = ""
        if (file) {
            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "video/mp4",
                "video/webm",
                "video/ogg",
            ]
            if (!allowedTypes.includes(file.mimetype)) {
                return res
                    .status(400)
                    .send("Invalid file type. Only images and videos are allowed.")
            }
            mediaUrl = await uploadToLocal(file, "communityPosts")
        }
        // Process mentions in caption
        const mentionedUsers = await processMentions(caption || "")

        const post = await Post.create({
            creator: userId,
            caption: caption ?? "",
            url: mediaUrl,
            community: communityId,
            mentionedUsers,
        })

        // Create notifications for mentioned users
        if (mentionedUsers.length > 0) {
            const notificationPromises = mentionedUsers.map((mentionedUserId) =>
                Notification.create({
                    type: "mention",
                    to: mentionedUserId,
                    from: userId,
                    references: [{ modelRef: "Post", data: post._id }],
                })
            )
            await Promise.all(notificationPromises)
        }

        await post.populate({ path: "creator", select: "username profilePic" })
        res.send({ post })
    }
)

router.get("/search", unrequiredAuth, async (req, res) => {
    const { searchTerm, category } = req.query
    const userId = req.user?._id

    const filter = {}
    if (!searchTerm && !category) return res.status(400).send("Insufficent data provided")

    if (searchTerm) filter.name = { $regex: new RegExp(searchTerm, "i") }
    if (category) filter.category = { $eq: category }

    // Add blocked users filter if user is logged in
    if (userId) {
        const blocks = await Blocks.find({
            $or: [{ blocker: userId }, { blocked: userId }],
        }).select("blocker blocked")

        const blockedUserIds = blocks.map((block) =>
            block.blocker.equals(userId) ? block.blocked : block.blocker
        )

        filter.creator = { $nin: blockedUserIds }
    }

    const results = await Community.find(filter).limit(40).lean()

    let memberships = []
    if (userId) {
        const communityIds = results.map((c) => c._id)
        memberships = await CommunityMembership.find({
            user: userId,
            community: { $in: communityIds },
        })
            .select("community")
            .lean()

        console.log(memberships)
    }
    const membershipSet = new Set(memberships.map((m) => String(m.community)))

    const enhancedResults = results.map((c) => ({
        ...c,
        isMember: userId ? membershipSet.has(String(c._id)) : false,
    }))

    res.send(enhancedResults)
})

router.get("/communities", [auth], async (req, res) => {
    const { timestamp } = req.params
    const LIMIT = 30

    const query = { user: req.user._id, ...(timestamp && { updatedAt: { $lt: timestamp } }) }
    const memberships = await CommunityMembership.find(query)
        .sort({ updatedAt: -1 })
        .limit(LIMIT + 1)
        .populate({
            path: "community",
            populate: {
                path: "creator",
                model: "User",
                select: "username profilePic", // keep creator payload small
            },
        })
        .lean()

    const communities = memberships.map((m) => ({
        ...m.community,
        isMember: true,
    }))

    const { data, nextCursor } = getPaginatedResponse(communities, LIMIT)
    const response = { data, nextCursor }

    res.send(response)
})

router.get("/:communityid", [unrequiredAuth], async (req, res) => {
    console.log("called")

    const userId = req.user?._id
    const communityId = req.params.communityid
    if (!communityId) return res.status(400).send("Need community id")

    const storyLookupStage = userId
        ? getStoryLookupStage(new mongoose.Types.ObjectId(userId), "$creator._id")
        : []

    const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(communityId) } },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
                pipeline: [{ $project: { username: 1, profilePic: 1 } }],
            },
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        ...storyLookupStage,
    ]
    if (userId) {
        pipeline.push(
            {
                $lookup: {
                    from: "communitymemberships",
                    let: { commId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$community", "$$commId"] },
                                        { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
                                    ],
                                },
                            },
                        },
                        { $limit: 1 },
                    ],
                    as: "memberLookup",
                },
            },
            { $addFields: { isMember: { $gt: [{ $size: "$memberLookup" }, 0] } } },
            { $project: { memberLookup: 0 } }
        )
    } else {
        pipeline.push({ $addFields: { isMember: false } })
    }

    const results = await Community.aggregate(pipeline)
    const community = results[0]
    if (!community) return res.status(400).send("Could not find community")

    res.send(community)
})

router.post("/join/:communityid", [auth], async (req, res) => {
    const { communityid: communityId } = req.params
    const userId = req.user._id
    if (!communityId) return res.status(400).send("No community id.")

    const community = await Community.findOne({ _id: communityId })
    if (!community) return res.status(400).send("Cannot find community")

    // Check for blocks between the user and community creator
    const blockExists = await Blocks.findOne({
        $or: [
            { blocker: userId, blocked: community.creator },
            { blocker: community.creator, blocked: userId },
        ],
    })

    if (blockExists) {
        return res.status(403).send("Cannot join this community")
    }

    const existing = await CommunityMembership.exists({ community: communityId, user: userId })
    if (existing) return res.status(400).send("Cannot join community")

    await CommunityMembership.create({
        user: userId,
        community: communityId,
    })
    await community.updateOne({ $inc: { memberCount: 1 } })
    res.send({ joined: true })
})

router.delete("/posts/:postid", [auth], async (req, res) => {
    const { postid } = req.params
    const userId = req.user._id
    const post = await Post.findById(postid)
    if (!post) return res.status(404).send("Post not found")
    if (String(post.creator) !== String(userId))
        return res.status(403).send("Not authorized to delete this post")
    await post.deleteOne()
    res.send({ deleted: true })
})

// Leave community endpoint
router.post("/leave/:communityid", [auth], async (req, res) => {
    const userId = req.user._id
    const communityId = req.params.communityid
    if (!communityId) return res.status(400).send({ message: "Community ID required" })

    // Check if user is a member
    const membership = await CommunityMembership.findOne({ user: userId, community: communityId })
    if (!membership)
        return res.status(400).send({ message: "You are not a member of this community." })

    const result = await CommunityMembership.deleteOne({ _id: membership._id })

    if (result.deletedCount > 0) {
        await Community.findByIdAndUpdate(communityId, { $inc: { memberCount: -1 } })
    } else {
        return res.status(400).send({ message: "Could not leave community." })
    }

    res.send({ message: "Left community successfully." })
})

module.exports = router
