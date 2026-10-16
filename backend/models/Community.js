const mongoose = require("mongoose")

const ACCEPTED_CATEGORIES = ["LooksMaxxing", "Fitness", "Money", "Self-Improvement"]

const commununitySchema = new mongoose.Schema(
    {
        name: { type: String, default: "", max: 30 },
        description: { type: String, min: 1, max: 400, required: true },
        category: {
            type: String,
            enum: ACCEPTED_CATEGORIES,
        },
        creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        memberCount: { type: Number, default: 0 },
    },
    { timestamps: true, minimize: false }
)

const communityMembershipSchema = new mongoose.Schema(
    {
        community: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Community",
            required: true,
            index: true,
        },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    },
    { timestamps: true }
)

const Community = mongoose.model("Community", commununitySchema)
const CommunityMembership = mongoose.model("CommunityMembership", communityMembershipSchema)

module.exports = { Community, CommunityMembership, ACCEPTED_CATEGORIES }
