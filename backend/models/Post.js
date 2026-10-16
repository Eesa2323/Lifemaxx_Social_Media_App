const mongoose = require("mongoose")

const postSchema = new mongoose.Schema(
    {
        caption: { type: String, maxLength: 2000, default: "" },
        url: { type: String, default: "" },
        commentCount: { type: Number, default: 0, min: 0 },
        likeCount: { type: Number, default: 0, min: 0 },
        creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        journey: { type: mongoose.Schema.Types.ObjectId, ref: "Journey" },
        community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
        mentionedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
)

const postLikeSchema = new mongoose.Schema(
    {
        liker: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
)

const commentSchema = new mongoose.Schema(
    {
        creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
        content: { type: String, required: true },
        likeCount: { type: Number, default: 0, min: 0 },
        replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
        replyCount: { type: Number, default: 0, min: 0 },
        mentionedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
)
const commentLikeSchema = new mongoose.Schema(
    {
        liker: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
)

const Post = mongoose.model("Post", postSchema)
const PostLike = mongoose.model("PostLike", postLikeSchema)
const Comment = mongoose.model("Comment", commentSchema)
const CommentLike = mongoose.model("CommentLike", commentLikeSchema)

module.exports = {
    Post,
    PostLike,
    Comment,
    CommentLike,
}
