const { User } = require("../models/User")

/**
 * Parse mentions from text content
 * @param {string} content - The text content to parse
 * @returns {Array} Array of usernames found in mentions
 */
function parseMentions(content) {
    if (!content || typeof content !== "string") return []

    const mentionRegex = /@(\w+)/g
    const mentions = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
        const username = match[1]
        if (username && !mentions.includes(username)) {
            mentions.push(username)
        }
    }

    return mentions
}

/**
 * Find user IDs for mentioned usernames
 * @param {Array} usernames - Array of usernames to find
 * @returns {Promise<Array>} Array of user IDs
 */
async function findMentionedUsers(usernames) {
    if (!usernames || usernames.length === 0) return []

    try {
        const users = await User.find({ username: { $in: usernames } }).select("_id username")
        return users.map((user) => user._id)
    } catch (error) {
        console.error("Error finding mentioned users:", error)
        return []
    }
}

/**
 * Process content and extract mentioned users
 * @param {string} content - The text content to process
 * @returns {Promise<Array>} Array of user IDs for mentioned users
 */
async function processMentions(content) {
    const mentionedUsernames = parseMentions(content)
    return await findMentionedUsers(mentionedUsernames)
}

module.exports = {
    parseMentions,
    findMentionedUsers,
    processMentions,
}
