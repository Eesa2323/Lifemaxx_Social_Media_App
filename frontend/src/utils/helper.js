export const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 7) return date.toLocaleDateString()
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return "now"
}

export function getFormattedUserList(users, displayLimit) {
    if (!users?.length) return ""
    else if (users.length === 1) return users[0].username
    else if (users.length <= displayLimit) {
        const usernames =
            users
                .slice(0, -1)
                .map((u) => u.username)
                .join(", ") + ` and ${users.at(-1).username}`
        return usernames
    } else {
        const slicedUsers = users.slice(0, displayLimit)
        const slicedUsernames = slicedUsers.map((t) => t.username).join(",")
        const remainingUserCount = users.length - slicedUsers.length

        return `${slicedUsernames} and ${remainingUserCount} others`
    }
}

export function getAdminMessageText(message) {
    const placeholderChar = "^"
    const messageText = message.messageText

    if (!messageText.includes(placeholderChar)) return messageText
    else if (!message.referencedUsers) return ""

    const formattedUserList = getFormattedUserList(message.referencedUsers, 2)
    const formattedMessageText = messageText.replace("^", formattedUserList)

    return formattedMessageText
}
