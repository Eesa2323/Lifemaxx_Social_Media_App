const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const { Post, PostLike, Comment, CommentLike } = require("../models/Post")
const { Journey } = require("../models/Journey")
const { uploadToLocal } = require("../utils/upload")
const { User, Blocks } = require("../models/User")
const fileUpload = require("express-fileupload")
const { validatePostCreation } = require("../middleware/validation")
const mongoose = require("mongoose")
const { Notification } = require("../models/Notification")
const unrequiredAuth = require("../middleware/unrequiredAuth")
const {
    delay,
    getPostsPipeline,
    getContentAuthorizedStage,
    getStoryLookupStage,
    checkBlockExistance,
    getBlockExclusionStages,
} = require("../utils/helper")
const { Follow } = require("../models/Follow")
const { processMentions } = require("../utils/mentionHelper")

const POST_FILE_UPLOAD_CONFIG = fileUpload({
    limits: {
        fileSize: 60 * 1024 * 1024,
    },
    useTempFiles: false,
    abortOnLimit: true,
    responseOnLimit: "File size is too large. Max size is 10MB",
    createParentPath: false,
})

router.post("/", [auth, POST_FILE_UPLOAD_CONFIG, validatePostCreation], async (req, res) => {
    const { journeyid, caption } = req.body
    const userid = req.user._id
    const file = req.files && req.files.file

    if (!journeyid) return res.status(400).send({ message: "Journey ID is required" })

    const journey = await Journey.exists({ _id: journeyid, creator: userid })
    if (!journey) return res.status(400).send("Could not add post to journey")

    // Process mentions in caption
    const mentionedUsers = await processMentions(caption || "")

    const mediaUrl = file ? await uploadToLocal(file, "posts") : ""
    const post = await Post.create({
        creator: userid,
        caption: caption ?? "",
        url: mediaUrl,
        journey: journey._id,
        mentionedUsers,
    })

    // Create notifications for mentioned users
    if (mentionedUsers.length > 0) {
        const notificationPromises = mentionedUsers.map((userId) =>
            Notification.create({
                type: "mention",
                to: userId,
                from: userid,
                references: [{ modelRef: "Post", data: post._id }],
            })
        )
        await Promise.all(notificationPromises)
    }

    res.send({ post })
})

router.post("/comment/:postid", [auth], async (req, res) => {
    const { content, replyTo } = req.body
    const postId = req.params.postid
    const userId = req.user._id

    if (!content || content.length < 1 || content.length > 300)
        return res.status(400).send("Caption invalid length")
    else if (!postId) return res.status(400).send("Post ID is required")

    const post = await Post.findById(postId).populate("creator")
    if (!post) return res.status(400).send("Cannot find post")

    // Check for blocks between commenter and post creator
    const blockExists = await checkBlockExistance(userId, post.creator._id)
    if (blockExists) return res.status(403).send("Cannot comment due to block")

    if (!post.journey && !post.community)
        return res.status(400).send("Post must belong to a journey or community")

    // If post is in a community, check membership
    if (post.community) {
        const isMember = await require("../models/Community").CommunityMembership.exists({
            community: post.community,
            user: userId,
        })
        if (!isMember)
            return res
                .status(403)
                .send("You must be a member of this community to comment on this post.")
    }

    let replyId
    if (replyTo) {
        const parentComment = await Comment.findOneAndUpdate(
            { _id: replyTo, post: postId, replyTo: null },
            { $inc: { replyCount: 1 } }
        )

        if (!parentComment) return res.status(400).send("Cannot reply to comment")

        replyId = parentComment._id
    }

    // Process mentions in comment content
    const mentionedUsers = await processMentions(content)

    const comment = await Comment.create({
        content,
        post: post._id,
        creator: userId,
        mentionedUsers,
        ...(replyId && { replyTo: replyId }),
    })

    await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } })

    // Create comment notification for post creator
    if (comment && !comment.creator.equals(post.creator._id)) {
        await Notification.create({
            type: "comment",
            to: post.creator._id,
            from: comment.creator,
            references: [
                { modelRef: "Comment", data: comment._id },
                { modelRef: "Post", data: post._id },
            ],
        })
    }

    // Create mention notifications for mentioned users
    if (mentionedUsers.length > 0) {
        const notificationPromises = mentionedUsers.map((userId) =>
            Notification.create({
                type: "mention",
                to: userId,
                from: comment.creator,
                references: [
                    { modelRef: "Comment", data: comment._id },
                    { modelRef: "Post", data: post._id },
                ],
            })
        )
        const createdNotifications = await Promise.all(notificationPromises)
    }

    res.send({ comment })
})

router.get("/comments", [unrequiredAuth], async (req, res) => {
    const LIMIT = 20
    const { cursor, id, sortBy } = req.query
    const userId = req.user?._id && new mongoose.Types.ObjectId(req.user?._id)
    if (!id) return res.status(400).send("Post ID is required")

    // Community membership check
    const post = await Post.findById(id)
    if (!post) return res.status(400).send("Cannot find post")
    if (post.community) {
        if (!userId)
            return res.status(403).send("You must be a member of this community to view comments.")
        const isMember = await require("../models/Community").CommunityMembership.exists({
            community: post.community,
            user: userId,
        })
        if (!isMember)
            return res.status(403).send("You must be a member of this community to view comments.")
    }

    const authStage = getContentAuthorizedStage(userId)
    const storyLookupStage = userId ? getStoryLookupStage(userId, "$creator._id") : []
    const blockStages = userId ? await getBlockExclusionStages(userId, "creator") : []

    // Handle different sorting strategies
    let matchStage, sortStage, nextCursor

    if (sortBy === "mentions" && userId) {
        // Sort by mentions first, then timestamp
        sortStage = [{ $sort: { isMentioned: -1, createdAt: -1 } }]

        if (cursor) {
            try {
                const cursorData = JSON.parse(cursor)
                matchStage = {
                    $match: {
                        post: new mongoose.Types.ObjectId(id),
                        replyTo: null,
                        $or: [
                            {
                                isMentioned: cursorData.isMentioned,
                                createdAt: { $lt: new Date(cursorData.createdAt) },
                            },
                            {
                                isMentioned: { $lt: cursorData.isMentioned },
                            },
                        ],
                    },
                }
            } catch (error) {
                console.error("Error parsing mention cursor:", error)
                matchStage = { $match: { post: new mongoose.Types.ObjectId(id), replyTo: null } }
            }
        } else {
            matchStage = { $match: { post: new mongoose.Types.ObjectId(id), replyTo: null } }
        }
    } else {
        // Default timestamp sorting
        sortStage = [{ $sort: { createdAt: -1 } }]

        if (cursor) {
            matchStage = {
                $match: {
                    post: new mongoose.Types.ObjectId(id),
                    replyTo: null,
                    createdAt: { $lt: new Date(cursor) },
                },
            }
        } else {
            matchStage = { $match: { post: new mongoose.Types.ObjectId(id), replyTo: null } }
        }
    }

    const pipeline = [
        matchStage,
        ...(userId ? blockStages : []),
        ...(sortBy === "mentions" && userId
            ? [
                  {
                      $addFields: {
                          isMentioned: {
                              $in: [userId, "$mentionedUsers"],
                          },
                      },
                  },
              ]
            : []),
        ...sortStage,
        { $limit: LIMIT + 1 },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
            },
        },
        { $unwind: "$creator" },
        ...authStage,
        ...storyLookupStage,
        {
            $lookup: {
                from: "commentlikes",
                let: { commentId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$comment", "$$commentId"] },
                                    ...(userId ? [{ $eq: ["$liker", userId] }] : [{ $eq: [1, 0] }]),
                                ],
                            },
                        },
                    },
                ],
                as: "userLikes",
            },
        },

        {
            $lookup: {
                from: "users",
                localField: "mentionedUsers",
                foreignField: "_id",
                as: "mentionedUsersData",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            profilePic: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                hasLiked: {
                    $gt: [{ $size: { $ifNull: ["$userLikes", []] } }, 0],
                },
                creator: {
                    _id: "$creator._id",
                    username: "$creator.username",
                    profilePic: "$creator.profilePic",
                },
            },
        },
        { $project: { userLikes: 0 } },
    ]

    let comments

    try {
        comments = await Comment.aggregate(pipeline)
    } catch (err) {
        console.log(err)
    }

    const hasNextPage = comments?.length > LIMIT
    const data = hasNextPage ? comments?.slice(0, -1) : comments

    // Handle different cursor strategies
    if (sortBy === "mentions" && userId && hasNextPage) {
        const lastComment = comments?.[LIMIT - 1]
        nextCursor = JSON.stringify({
            isMentioned: lastComment.isMentioned,
            createdAt: lastComment.createdAt.toISOString(),
        })
    } else {
        nextCursor = hasNextPage ? comments[LIMIT - 1].createdAt.toISOString() : undefined
    }

    res.send({
        data,
        nextCursor,
    })
})

router.get("/comments/replies", [unrequiredAuth], async (req, res) => {
    const LIMIT = 10
    const { cursor, id } = req.query
    const userId = req.user?._id && new mongoose.Types.ObjectId(req.user._id)
    if (!id) return res.status(400).send("Comment ID is required")

    // Community membership check
    const parentComment = await Comment.findById(id)
    if (!parentComment) return res.status(400).send("Cannot find parent comment")
    const post = await Post.findById(parentComment.post)
    if (!post) return res.status(400).send("Cannot find post")
    if (post.community && userId) {
        const isMember = await require("../models/Community").CommunityMembership.exists({
            community: post.community,
            user: userId,
        })
        if (!isMember)
            return res.status(403).send("You must be a member of this community to view replies.")
    }

    await delay(9000)

    const storyLookupStage = userId ? getStoryLookupStage(userId, "$creator._id") : []
    const blockStages = userId ? await getBlockExclusionStages(userId, "$creator._id") : []

    const matchStage = cursor
        ? {
              $match: {
                  replyTo: new mongoose.Types.ObjectId(id),
                  createdAt: { $lt: new Date(cursor) },
              },
          }
        : { $match: { replyTo: new mongoose.Types.ObjectId(id) } }

    const pipeline = [
        matchStage,
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
            },
        },
        { $unwind: "$creator" },
        ...storyLookupStage,
    ]

    // Only add commentlikes lookup if userId is present
    if (userId) {
        pipeline.push({
            $lookup: {
                from: "commentlikes",
                let: { commentId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$comment", "$$commentId"] },
                                    { $eq: ["$liker", userId] },
                                ],
                            },
                        },
                    },
                ],
                as: "userLikes",
            },
        })
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "mentionedUsers",
                foreignField: "_id",
                as: "mentionedUsersData",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            profilePic: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                hasLiked: userId ? { $gt: [{ $size: "$userLikes" }, 0] } : false,
                creator: {
                    _id: "$creator._id",
                    username: "$creator.username",
                    profilePic: "$creator.profilePic",
                },
            },
        },
        { $project: { userLikes: 0 } },
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 }
    )

    const comments = await Comment.aggregate(pipeline)

    const hasNextPage = comments.length > LIMIT
    const data = hasNextPage ? comments.slice(0, -1) : comments

    res.send({
        data,
        nextCursor: hasNextPage ? comments[LIMIT - 1].createdAt.toISOString() : undefined,
    })
})

router.get("/", [unrequiredAuth], async (req, res) => {
    const LIMIT = 20
    const { cursor, id } = req.query
    const userId = req.user?._id && new mongoose.Types.ObjectId(req.user._id)
    if (!id) return res.status(400).send({ message: "Journey ID is required" })

    const matchStage = cursor
        ? {
              $match: {
                  createdAt: { $lt: new Date(cursor) },
                  journey: new mongoose.Types.ObjectId(id),
              },
          }
        : { $match: { journey: new mongoose.Types.ObjectId(id) } }

    const pipeline = await getPostsPipeline(matchStage, userId, LIMIT)

    if (!Array.isArray(pipeline) || pipeline.length === 0) {
        return res.status(500).send({
            message: "Error constructing pipeline",
            error: "Pipeline is empty or invalid",
        })
    }

    const posts = await Post.aggregate(pipeline)

    const hasNextPage = posts.length > LIMIT
    const data = hasNextPage ? posts.slice(0, -1) : posts

    res.send({
        data,
        nextCursor: hasNextPage ? posts[LIMIT - 1].createdAt.toISOString() : undefined,
    })
})

router.post("/like/:postid", [auth], async (req, res) => {
    const postId = req.params.postid
    const value = req.body.value
    const userId = req.user._id
    if (!postId || typeof value !== "boolean") return res.status(400).send("Cannot like post")

    const post = await Post.findById(postId).populate("creator")
    if (!post) return res.status(404).send("Post not found")

    // Check for blocks between liker and post creator
    const blockExists = await checkBlockExistance(userId, post.creator._id)
    if (blockExists) return res.status(403).send("Cannot like post due to block")

    if (!post.journey && !post.community)
        return res.status(400).send("Post must belong to a journey or community") // If post is in a community, check membership
    if (post.community) {
        const isMember = await require("../models/Community").CommunityMembership.exists({
            community: post.community,
            user: userId,
        })
        if (!isMember)
            return res.status(403).send("You must be a member of this community to like this post.")
    }

    if (!value) {
        const { deletedCount } = await PostLike.deleteOne({ liker: userId, post: postId })
        if (!deletedCount) return res.status(400).send("Cannot unlike post")
    } else {
        const existingLike = await PostLike.exists({ liker: userId, post: postId })
        if (existingLike) return res.status(400).send("Already liked post")
        await PostLike.create({ liker: userId, post: postId })
    }

    const incVal = !value ? -1 : 1
    await Post.updateOne({ _id: postId }, { $inc: { likeCount: incVal } })

    res.send({ liked: value })
})

router.post("/comment/like/:commentid", [auth], async (req, res) => {
    const commentId = req.params.commentid
    const value = req.body.value
    const userId = req.user._id
    if (!commentId || typeof value !== "boolean") return res.status(400).send("Cannot like comment")

    const comment = await Comment.findById(commentId).populate("creator")
    if (!comment) return res.status(400).send("Cannot find comment")

    // Check for blocks between liker and comment creator
    const blockExists = await checkBlockExistance(userId, comment.creator._id)
    if (blockExists) return res.status(403).send("Cannot like comment due to block")

    const post = await Post.findById(comment.post)
    if (!post) return res.status(400).send("Cannot find post")
    if (!post.journey && !post.community)
        return res.status(400).send("Post must belong to a journey or community")

    // If post is in a community, check membership
    if (post.community) {
        const isMember = await require("../models/Community").CommunityMembership.exists({
            community: post.community,
            user: userId,
        })
        if (!isMember)
            return res
                .status(403)
                .send("You must be a member of this community to like this comment.")
    }

    if (!value) {
        const { deletedCount } = await CommentLike.deleteOne({ liker: userId, comment: commentId })
        if (!deletedCount) return res.status(400).send("Cannot unlike comment")
    } else {
        const existingLike = await CommentLike.exists({ liker: userId, comment: commentId })
        if (existingLike) return res.status(400).send("Already liked comment")
        await CommentLike.create({ liker: userId, comment: commentId })
    }

    const incVal = !value ? -1 : 1
    await Comment.updateOne({ _id: commentId }, { $inc: { likeCount: incVal } })

    res.send({ liked: value })
})

router.delete("/comment/:id", [auth], async (req, res) => {
    const { id } = req.params
    if (!id) return res.status(400).send({ message: "Comment ID is required" })

    try {
        const comment = await Comment.findById(id)
        if (!comment) return res.status(404).send({ message: "Comment not found" })

        // Check if user is the creator
        if (comment.creator.toString() !== req.user._id.toString()) {
            return res.status(403).send({ message: "You can only delete your own comments" })
        }

        // Delete all likes associated with this comment
        await CommentLike.deleteMany({ comment: id })

        // Delete all replies to this comment
        await Comment.deleteMany({ replyTo: id })

        // Delete the comment
        await Comment.findByIdAndDelete(id)

        // Update post comment count
        await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } })

        // If this was a reply, update parent comment reply count
        if (comment.replyTo) {
            await Comment.updateOne({ _id: comment.replyTo }, { $inc: { replyCount: -1 } })
        }

        res.send({ message: "Comment deleted successfully" })
    } catch (error) {
        console.error(error)
        res.status(500).send({ message: "Server error" })
    }
})

router.get("/comment/likes/:commentid", unrequiredAuth, async (req, res) => {
    const LIMIT = 20
    const { cursor } = req.query
    const commentId = req.params.commentid

    if (!commentId) return res.status(400).send("Comment ID is required")

    const comment = await Comment.findById(commentId)
    if (!comment) return res.status(400).send("Cannot find comment")

    const userId = req.user?._id && new mongoose.Types.ObjectId(req.user._id)

    const storyLookupStage = userId ? getStoryLookupStage(userId, "$liker._id") : []
    const blockStages = userId ? await getBlockExclusionStages(userId, "liker") : []

    const matchStage = cursor
        ? {
              $match: {
                  comment: new mongoose.Types.ObjectId(commentId),
                  createdAt: { $lt: new Date(cursor) },
              },
          }
        : { $match: { comment: new mongoose.Types.ObjectId(commentId) } }

    const pipeline = [
        matchStage,
        ...(userId ? blockStages : []),
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
        {
            $lookup: {
                from: "users",
                localField: "liker",
                foreignField: "_id",
                as: "liker",
            },
        },
        { $unwind: "$liker" },
        ...storyLookupStage,
        {
            $project: {
                _id: 1,
                createdAt: 1,
                liker: {
                    _id: "$liker._id",
                    username: "$liker.username",
                    profilePic: "$liker.profilePic",
                },
            },
        },
    ]

    const likes = await CommentLike.aggregate(pipeline)
    const hasNextPage = likes.length > LIMIT
    const data = hasNextPage ? likes.slice(0, -1) : likes

    res.send({
        data,
        nextCursor: hasNextPage ? likes[LIMIT - 1].createdAt.toISOString() : undefined,
    })
})

router.get("/likes/:postid", unrequiredAuth, async (req, res) => {
    const LIMIT = 20
    const { cursor } = req.query
    const postId = req.params.postid

    if (!postId) return res.status(400).send("Post ID is required")

    const post = await Post.findById(postId)
    if (!post) return res.status(400).send("Cannot find post")

    const userId = req.user?._id && new mongoose.Types.ObjectId(req.user._id)
    const storyLookupStage = userId ? getStoryLookupStage(userId, "$liker._id") : []
    const blockStages = userId ? await getBlockExclusionStages(userId, "liker") : []

    const matchStage = cursor
        ? {
              $match: {
                  post: new mongoose.Types.ObjectId(postId),
                  createdAt: { $lt: new Date(cursor) },
              },
          }
        : { $match: { post: new mongoose.Types.ObjectId(postId) } }

    const pipeline = [
        matchStage,
        ...(userId ? blockStages : []),
        { $sort: { createdAt: -1 } },
        { $limit: LIMIT + 1 },
        {
            $lookup: {
                from: "users",
                localField: "liker",
                foreignField: "_id",
                as: "liker",
            },
        },
        { $unwind: "$liker" },
        ...storyLookupStage,
        {
            $project: {
                _id: 1,
                createdAt: 1,
                liker: {
                    _id: "$liker._id",
                    username: "$liker.username",
                    profilePic: "$liker.profilePic",
                },
            },
        },
    ]

    const likes = await PostLike.aggregate(pipeline)
    const hasNextPage = likes.length > LIMIT
    const data = hasNextPage ? likes.slice(0, -1) : likes

    res.send({
        data,
        nextCursor: hasNextPage ? likes[LIMIT - 1].createdAt.toISOString() : undefined,
    })
})

router.get("/feed", unrequiredAuth, async (req, res) => {
    const LIMIT = 3
    const { cursor } = req.query
    const userId = req.user?._id && new mongoose.Types.ObjectId(req.user._id)
    const storyLookupStage = userId ? getStoryLookupStage(userId, "$creator._id") : []

    // 2. Aggregate pipeline for posts
    const matchStage = {
        $and: [
            { journey: { $ne: null } },
            { community: null },
            cursor ? { createdAt: { $lt: new Date(cursor) } } : {},
        ],
    }

    const blockStages = userId ? await getBlockExclusionStages(userId, "creator") : []

    const pipeline = [
        { $match: matchStage },
        ...(userId ? blockStages : []),
        {
            $lookup: {
                from: "journeys",
                localField: "journey",
                foreignField: "_id",
                as: "journey",
            },
        },
        { $unwind: "$journey" },
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
            },
        },
        { $unwind: "$creator" },
        ...storyLookupStage,
    ]

    // Only exclude current user's posts and add following logic if userId is present
    if (userId) {
        // 1. Get following user IDs
        const followingIds = await Follow.find({ follower: userId }).distinct("following")

        pipeline.push(
            // Exclude posts where creator is the current user
            {
                $match: {
                    "creator._id": { $ne: userId },
                },
            },
            // Add isPublic field for creator
            {
                $addFields: {
                    isFollowed: { $in: ["$creator._id", followingIds] },
                    isPublic: { $eq: ["$creator.privacyStatus", false] },
                },
            },
            // Only posts from followed users or public users
            {
                $match: {
                    $or: [{ isFollowed: true }, { isPublic: true }],
                },
            }
        )
    } else {
        // For unauthenticated users, only show public posts
        pipeline.push(
            {
                $addFields: {
                    isPublic: { $eq: ["$creator.privacyStatus", false] },
                },
            },
            {
                $match: {
                    isPublic: true,
                },
            }
        )
    }

    pipeline.push({ $sort: { createdAt: -1 } }, { $limit: LIMIT + 1 })

    // Only add postlikes lookup if userId is present
    if (userId) {
        pipeline.push({
            $lookup: {
                from: "postlikes",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [{ $eq: ["$post", "$$postId"] }, { $eq: ["$liker", userId] }],
                            },
                        },
                    },
                ],
                as: "userLikes",
            },
        })
    }

    pipeline.push({
        $addFields: {
            hasLiked: userId ? { $gt: [{ $size: "$userLikes" }, 0] } : false,
            creator: {
                _id: "$creator._id",
                username: "$creator.username",
                profilePic: "$creator.profilePic",
                privacyStatus: "$creator.privacyStatus",
            },
        },
    })

    if (userId) {
        pipeline.push({ $project: { userLikes: 0 } })
    }

    let posts
    try {
        posts = await Post.aggregate(pipeline)
    } catch (err) {
        console.log(err)
    }

    const hasNextPage = posts.length > LIMIT
    const data = hasNextPage ? posts.slice(0, LIMIT) : posts
    res.send({
        data,
        nextCursor: hasNextPage ? data[data.length - 1].createdAt.toISOString() : undefined,
    })
})

router.get("/post/:id", [unrequiredAuth], async (req, res) => {
    const postId = req.params.id
    const userId = req.user?._id && new mongoose.Types.ObjectId(req.user._id)
    if (!postId) return res.status(400).send({ message: "Post ID is required" })

    const post = await Post.findById(postId).populate("creator")
    if (!post) return res.status(404).send({ message: "Post not found" })

    // Check for blocks between viewer and post creator
    if (userId) {
        const blockExists = await checkBlockExistance(userId, post.creator._id)
        if (blockExists) return res.status(403).send({ message: "Cannot view post due to block" })
    }

    const storyLookupStage = userId ? getStoryLookupStage(userId, "$creator._id") : []

    // If post is in a community, check membership
    if (post.community) {
        if (!userId)
            return res
                .status(403)
                .send({ message: "You must be a member of this community to view this post." })
        const isMember = await require("../models/Community").CommunityMembership.exists({
            community: post.community,
            user: userId,
        })
        if (!isMember)
            return res
                .status(403)
                .send({ message: "You must be a member of this community to view this post." })
    }

    const matchStage = { $match: { _id: new mongoose.Types.ObjectId(postId) } }
    const pipeline = [
        matchStage,
        {
            $lookup: {
                from: "users",
                localField: "creator",
                foreignField: "_id",
                as: "creator",
            },
        },
        { $unwind: "$creator" },
        {
            $addFields: {
                creator: {
                    _id: "$creator._id",
                    username: "$creator.username",
                    profilePic: "$creator.profilePic",
                    privacyStatus: "$creator.privacyStatus",
                },
                // Ensure community and journey fields are preserved
                community: "$community",
                journey: "$journey",
            },
        },
    ]

    if (userId) {
        pipeline.push(
            {
                $lookup: {
                    from: "postlikes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: [
                                                { $toString: "$post" },
                                                { $toString: "$$postId" },
                                            ],
                                        },
                                    },
                                    {
                                        $expr: {
                                            $eq: [{ $toString: "$liker" }, userId.toString()],
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                    as: "userLikes",
                },
            },
            {
                $addFields: {
                    hasLiked: { $gt: [{ $size: "$userLikes" }, 0] },
                },
            },
            ...storyLookupStage
        )
    } else {
        pipeline.push({
            $addFields: { hasLiked: false },
        })
    }

    pipeline.push({ $project: { userLikes: 0 } })

    const posts = await Post.aggregate(pipeline)
    if (!posts[0]) return res.status(404).send({ message: "Post not found" })

    res.send({ post: posts[0] })
})

router.delete("/:id", [auth], async (req, res) => {
    const { id } = req.params
    if (!id) return res.status(400).send({ message: "Post ID is required" })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).send({ message: "Post not found" })

        // Check if user is the creator
        if (post.creator.toString() !== req.user._id.toString()) {
            return res.status(403).send({ message: "You can only delete your own posts" })
        }

        // Delete all comments associated with this post
        await Comment.deleteMany({ post: id })

        // Delete all likes associated with this post
        await PostLike.deleteMany({ post: id })

        // Delete the post
        await Post.findByIdAndDelete(id)

        res.send({ message: "Post deleted successfully" })
    } catch (error) {
        res.status(500).send({ message: "Server error" })
    }
})

module.exports = { router, POST_FILE_UPLOAD_CONFIG }
