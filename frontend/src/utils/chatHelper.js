export function setNewUnreadCount(unreadCount, maxCount, operand = null) {
    if (!unreadCount) return "0"
    const currentCount = parseInt(unreadCount.toString().match(/\d+/)?.[0])

    const newCount = operand ? currentCount + operand : currentCount

    const newUnreadCount =
        newCount >= maxCount ? `${maxCount}+` : newCount <= 0 ? `0` : `${newCount}`
    return newUnreadCount
}

export function getChatUsernames(users, userId) {
    if (!users?.length) return ""
    const partialUserData = users.slice(0, 3)

    return partialUserData
        .filter((u) => u._id !== userId)
        .map((u) => u.username)
        .join(", ")
}

export function getChatTitle(chat, newChatUsers) {
    if (chat) return chat.chatTitle
    return getFormattedUserList(newChatUsers, 4)
}

export function getSenderInfo(message, privateChatParticipants = []) {
    let senderData = {}

    if (!message?.sender) return {}
    else if (typeof message.sender === "string" && privateChatParticipants.length) {
        const targetUser = privateChatParticipants.find((u) => u._id === message.sender)
        if (targetUser) {
            senderData = {
                _id: targetUser._id,
                username: targetUser.username,
                profilePic: targetUser.profilePic,
            }
        }
    } else {
        senderData = {
            _id: message.sender._id,
            username: message.sender.username,
            profilePic: message.sender.profilePic,
        }
    }

    return senderData
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

export function getFormattedIndicatorText(users, isPrivateChat, type) {
    if (!users.length) return ""
    else if (isPrivateChat) return type === "typing" ? "Typing" : "Seen"

    const formattedUserList = getFormattedUserList(users, 4)

    if (users.length === 1) {
        return type === "typing"
            ? `${formattedUserList} is typing...`
            : `Seen by ${formattedUserList}`
    } else {
        return type === "typing"
            ? `${formattedUserList} are typing...`
            : `Seen by ${formattedUserList}`
    }
}

export function retrieveSeenUsers(chatData, userId, messageDate) {
    if (!chatData || !messageDate || !userId) return ""
    const timestamps = chatData.latestReadTimestamps

    let seenUsers = []
    for (const uid in timestamps) {
        if (timestamps[uid] >= messageDate && uid !== userId) {
            const userData = chatData.users.find((u) => u._id === uid)
            userData && seenUsers.push(userData)
        }
    }

    return getFormattedIndicatorText(seenUsers)
}

export function testSeenUsers(seenData) {
    if (!seenData?.length) return
    return getFormattedIndicatorText(seenData)
}

export function retrieveTypingUsers(activeTypers, chatUsers, isPrivateChat) {
    // if (!chatUsers?.length) return

    // const typersData = activeTypers.map((id) => chatUsers.find((u) => u._id === id))
    // return getFormattedIndicatorText(typersData, isPrivateChat, "typing")

    if (!chatUsers?.length) return

    const count = activeTypers?.length
    if (!count) return ""

    if (isPrivateChat) {
        return "Typing..."
    }

    const names = activeTypers.map((u) => u.username)

    if (count === 1) {
        return `${names[0]} is typing...`
    }

    if (count < 5) {
        const last = names.pop()
        return `${names.join(", ")} and ${last} are typing...`
    }

    const [first, second, third] = names
    const others = count - 3
    return `${first}, ${second}, ${third} and ${others} others are typing...`
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
