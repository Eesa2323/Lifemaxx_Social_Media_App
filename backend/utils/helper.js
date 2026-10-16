const {
    Types: { ObjectId },
    get,
} = require("mongoose")
const { Blocks } = require("../models/User")

const delay = (ms) => new Promise((res, _) => setTimeout(() => res("resolved"), ms))

async function checkBlockExistance(userId, targetId) {
    return await Blocks.findOne({
        $or: [
            { blocker: userId, blocked: targetId },
            { blocker: targetId, blocked: userId },
        ],
    })
}

function getFollowFieldStage(userId, targetUserFieldName = "$_id") {
    return [
        {
            $lookup: {
                from: "follows",
                let: { targetId: targetUserFieldName, uid: userId },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$follower", "$$uid"] },
                                    { $eq: ["$following", "$$targetId"] },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                ],
                as: "followDocs",
            },
        },
        {
            $addFields: {
                isFollowing: { $gt: [{ $size: "$followDocs" }, 0] },
            },
        },
    ]
}

function getContentAuthorizedStage(userId, targetUserFieldName = "$creator._id") {
    const followStage = getFollowFieldStage(userId, targetUserFieldName)

    return [...(userId ? followStage : [])]
}

function getFollowAndRequestFieldsStages(userId, targetUserFieldName = "$_id") {
    const followStage = getFollowFieldStage(userId, targetUserFieldName)
    return [
        ...followStage,
        {
            $lookup: {
                from: "requests",
                let: { targetId: targetUserFieldName, uid: new ObjectId(userId) },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$requester", "$$uid"] },
                                    { $eq: ["$requested", "$$targetId"] },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                ],
                as: "requestDocs",
            },
        },
        { $addFields: { isRequested: { $gt: [{ $size: "$requestDocs" }, 0] } } },
    ]
}

function getPaginatedResponse(data, limit) {
    const hasMoreData = data.length > limit
    const nextCursor = hasMoreData ? data[data.length - 1].createdAt : undefined
    const dataResponse = hasMoreData ? data.slice(0, data.length - 1) : data

    return { data: dataResponse, nextCursor }
}

async function getBlockExclusionStages(userId, targetField = "creator") {
    if (!userId) return []

    // targetField is the field name in the document, e.g. "creator", "liker"

    // First stage: Match users who haven't blocked me or who I haven't blocked
    const blocks = await Blocks.find({
        $or: [{ blocker: userId }, { blocked: userId }],
    })
        .select("blocker blocked")
        .lean()

    const blockedUserIds = blocks.map((block) =>
        block.blocker.equals(userId) ? block.blocked : block.blocker
    )

    return [
        {
            $match: {
                [targetField]: { $nin: blockedUserIds },
            },
        },
        {
            $lookup: {
                from: "blocks",
                let: {
                    targetId: `$${targetField}`,
                    userId: new ObjectId(userId),
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    {
                                        $and: [
                                            { $eq: ["$blocker", "$$userId"] },
                                            { $eq: ["$blocked", "$$targetId"] },
                                        ],
                                    },
                                    {
                                        $and: [
                                            { $eq: ["$blocked", "$$userId"] },
                                            { $eq: ["$blocker", "$$targetId"] },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                ],
                as: "blocks",
            },
        },
        {
            $match: {
                blocks: { $size: 0 },
            },
        },
        {
            $project: {
                blocks: 0,
            },
        },
    ]
}

async function getPostsPipeline(matchStage, userId, limit) {
    if (!matchStage || !matchStage.$match) {
        return [{ $match: {} }] // Return default empty match if no match stage provided
    }

    const lookupStage = userId ? getStoryLookupStage(userId) : []
    const blockStages = userId ? await getBlockExclusionStages(userId, "creator") : []
    const pipeline = [
        matchStage,
        ...(Array.isArray(blockStages) ? blockStages : []),
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
                creator: {
                    _id: "$creator._id",
                    username: "$creator.username",
                    profilePic: "$creator.profilePic",
                },
            },
        },
        ...lookupStage,
        { $sort: { createdAt: -1 } },
        { $limit: limit + 1 },
    ]

    // Only add postlikes lookup and hasLiked field if userId is present
    if (userId) {
        pipeline.splice(1, 0, {
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

        // Add hasLiked field after the creator lookup
        pipeline.splice(4, 0, {
            $addFields: {
                hasLiked: { $gt: [{ $size: "$userLikes" }, 0] },
            },
        })

        // Remove userLikes field
        pipeline.splice(5, 0, { $project: { userLikes: 0 } })
    } else {
        // If no userId, set hasLiked to false
        pipeline.splice(3, 0, {
            $addFields: {
                hasLiked: false,
            },
        })
    }

    return pipeline
}

async function checkBlockExistance(userId, targetUserId) {
    const exists = await Blocks.exists({
        $or: [
            { blocker: userId, blocked: targetUserId },
            { blocker: targetUserId, blocked: userId },
        ],
    })

    return exists
}

function getStoryLookupStage(userId, creatorFieldName = "$creator._id") {
    return [
        {
            $lookup: {
                from: "stories",
                let: { creatorId: `${creatorFieldName}`, userId },
                pipeline: [
                    { $match: { $expr: { $eq: ["$$creatorId", "$user"] } } },
                    { $sort: { createdAt: -1 } },
                    { $limit: 1 },
                    { $addFields: { viewed: { $in: ["$$userId", "$views"] } } },
                ],
                as: "latestStory",
            },
        },
        { $unwind: { path: "$latestStory", preserveNullAndEmptyArrays: true } },
    ]
}

module.exports = {
    delay,
    getFollowFieldStage,
    getFollowAndRequestFieldsStages,
    getPaginatedResponse,
    getPostsPipeline,
    getContentAuthorizedStage,
    getBlockExclusionStages,
    getStoryLookupStage,
    checkBlockExistance,
}
