import React, { createContext, useCallback, useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"
import * as Ably from "ably"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { produce } from "immer"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import { getSenderInfo } from "../utils/chatHelper"
import { useLocation } from "react-router-dom"
import useChats from "../hooks/chats/useChats"
const ChatContext = createContext()

export function ChatProvider({ children }) {
    const authToken = useSelector((state) => state.auth.token)
    const queryClient = useQueryClient()
    const [ablyClient, setAblyClient] = useState(null)
    const axiosPrivate = useAxiosPrivate()
    const [selectedChatData, setSelectedChatData] = useState(null)
    const selectedChatRef = useRef(selectedChatData)
    const [activeTypingUsers, setActiveTypingUsers] = useState([])
    const [activeMessageMenu, setActiveMessageMenu] = useState({})
    const typingTimeouts = useRef({})
    const location = useLocation()
    const [selectedMessageId, setSelectedMessageId] = useState(null)

    const userId = useSelector((state) => state.auth.userData?._id)
    const pendingEventsRef = useRef(new Map())

    const updateSelectedChatData = useCallback(
        (data) => {
            setSelectedChatData(data)
        },
        [setSelectedChatData]
    )
    const updateActiveTypingUsers = (cond) => setActiveTypingUsers(cond)
    const updateActiveMessageMenu = (value) => setActiveMessageMenu(value)

    const updateLatestMessage = useCallback(
        (chatId, message = null) => {
            const messagesCacheData = queryClient.getQueryData(["messages", chatId])
            const latestMessageInCache = messagesCacheData?.pages?.[0]?.messages?.at(-1)

            const updatedLatestMessage = message || latestMessageInCache
            if (!updatedLatestMessage) return

            queryClient.setQueryData(["chats"], (prevChats) => {
                return produce(prevChats, (draft) => {
                    if (!draft) return

                    // Find index of the matching chat
                    const idx = draft.findIndex((c) => c._id === chatId)
                    if (idx === -1) return

                    // Update its latestMessage
                    draft[idx].latestMessage = updatedLatestMessage

                    // If not already at front, move it to index 0
                    if (idx > 0) {
                        const [moved] = draft.splice(idx, 1)
                        draft.unshift(moved)
                    }
                })
            })
        },
        [queryClient]
    )

    const addMessageToCache = (chatId, message, nextCursor = null) => {
        queryClient.setQueryData(["messages", chatId], (oldData) => {
            return produce(oldData, (draft) => {
                if (!oldData) {
                    draft = {
                        pages: [
                            {
                                messages: [message],
                                readUsers: { displayed: [], othersCount: 0 },
                                ...(nextCursor && { nextCursor }),
                            },
                        ],
                        pageParams: [message.createdAt],
                    }
                    return draft
                }

                const latestPage = draft.pages[0]
                latestPage.messages.push(message)
                latestPage.readUsers = { displayed: [], othersCount: 0 }
            })
        })

        queryClient.setQueryData(["chats"], (oldData) => {
            return produce(oldData, (draft) => {
                if (!oldData) return

                // Find the index of the chat to update
                const idx = draft.findIndex((c) => c._id === chatId)
                if (idx === -1) return

                draft[idx].latestMessage = message

                // Move it to the front if it's not already there
                if (idx > 0) {
                    const [movedChat] = draft.splice(idx, 1)
                    draft.unshift(movedChat)
                }
            })
        })
    }
    const deleteMessageFromCache = useCallback(
        (deletedMessage, chatId) => {
            queryClient.setQueryData(["messages", chatId], (prevData) => {
                if (!prevData) return prevData

                return produce(prevData, (draft) => {
                    const params = draft.pageParams
                    let pIndex = -1

                    if (params[0] < deletedMessage.createdAt || !params[0]) pIndex = 0
                    else pIndex = params?.findLastIndex((date) => deletedMessage.createdAt <= date)

                    const messages = draft.pages[pIndex]?.messages
                    if (!messages) return

                    const delMessageIndex = messages.findIndex((m) => m._id === deletedMessage._id)
                    delMessageIndex !== -1 && messages.splice(delMessageIndex, 1)
                })
            })
        },
        [queryClient]
    )
    const updateUnreadChatsCount = (value) => {
        queryClient.setQueryData(["chats", "unread_count"], (prevData) => {
            return produce(prevData, (draft) => {
                if (prevData.count === 0 && value === -1) return
                draft.count = draft.count + value
            })
        })
    }
    const deleteChatInCache = useCallback(
        (chatId) => {
            queryClient.removeQueries({ queryKey: ["messages", chatId] })
            queryClient.setQueryData(["chats"], (prevData) => {
                return produce(prevData, (draft) => {
                    if (!prevData) return

                    const chatIndex = draft.findIndex((c) => c._id === chatId)
                    chatIndex !== -1 && draft.splice(chatIndex, 1)
                })
            })
        },
        [queryClient]
    )
    const removeUserFromChat = useCallback(
        (chatId, userId, isOurChat = false) => {
            queryClient.setQueryData(["chats"], (prevData) => {
                return produce(prevData, (draft) => {
                    if (!prevData) return
                    else if (isOurChat) {
                        const chatIndex = draft.findIndex((c) => c._id === chatId)
                        chatIndex !== -1 && draft.splice(chatIndex, 1)
                    } else {
                        const chat = draft.find((c) => c._id === chatId)
                        const userIndex = chat.users.findIndex((u) => u._id === userId)
                        userIndex !== -1 && chat.users.splice(userIndex, 1)
                    }
                })
            })
        },
        [queryClient]
    )

    const flushPendingEvents = useCallback(
        (chatId) => {
            const queue = pendingEventsRef.current.get(chatId) || []
            if (queue.length === 0) return

            queryClient.setQueryData(["messages", chatId], (oldData) => {
                if (!oldData) return oldData

                return produce(oldData, (draft) => {
                    const latestPage = draft.pages[0]
                    const pageParams = draft.pageParams

                    for (const ev of queue) {
                        const { data, type } = ev
                        if (type === "newMessage") latestPage.messages.push(data)
                        else if (type === "deletedMessage") {
                            let pIdx

                            if (data.createdAt > pageParams[0]) pIdx = 0
                            else pIdx = pageParams.findLastIndex((d) => d >= data.createdAt)
                            if (pIdx === -1) return

                            const messageToDeleteIndex = draft.pages[pIdx].messages.findIndex(
                                (m) => m._id === data._id
                            )
                            if (messageToDeleteIndex === -1) return

                            draft.pages[pIdx].messages.splice(messageToDeleteIndex, 1)
                        }
                    }
                })
            })

            pendingEventsRef.current.delete(chatId)
        },
        [queryClient]
    )

    useEffect(() => {
        selectedChatRef.current = selectedChatData
    }, [selectedChatData])

    useEffect(() => {
        const path = location.pathname
        if (path === "/chats") return

        updateSelectedChatData(null)
    }, [location])

    useEffect(() => {
        setSelectedMessageId(null)
    }, [selectedChatData?.chatId])

    useEffect(() => {
        let client = null
        let channel = null
        let newMessageHandler = null
        let messageSeenHandler = null
        let deletedMessageHandler

        if (!authToken) {
            setAblyClient(null)
            return
        }

        client = new Ably.Realtime({
            authUrl: "http://localhost:5000/api/ably/token",
            authHeaders: { "x-auth-token": `${authToken}` },
            closeOnUnload: true,
        })

        client.connection.on("connected", () => {
            setAblyClient(client)
            if (client.connection.state === "connected") {
                channel = client.channels.get(`messages:${userId}`)

                let last = Promise.resolve()

                newMessageHandler = (d) => {
                    last = last
                        .then(async () => {
                            console.log("YO")

                            const selectedChat = selectedChatRef.current
                            const { previousMessageData, chatData, message, senderId, meta } =
                                d.data

                            console.log(meta)
                            if (senderId === userId) return
                            const isSelectedChat =
                                chatData.chatId === selectedChat?.chatId ||
                                chatData.privateChatKey === selectedChat?.privateChatKey

                            const chats = queryClient.getQueryData(["chats"])
                            let chat = chats?.find((c) => c._id === message.chat)
                            if (!chat) {
                                const { data: c } = await axiosPrivate.get(
                                    `${BASE_URL}/api/chats/${message.chat}`
                                )
                                if (chats) {
                                    queryClient.setQueryData(["chats"], (old) =>
                                        old ? [c, ...old] : [c]
                                    )
                                }

                                chat = c
                            } else if (chat && meta?.updatedChatDetails) {
                                queryClient.setQueryData(["chats"], (old) => {
                                    return produce(old, (draft) => {
                                        const chatIndex = draft.findIndex((c) => c._id === chat._id)
                                        if (chatIndex !== -1) {
                                            draft[chatIndex] = {
                                                ...draft[chatIndex],
                                                ...meta.updatedChatDetails,
                                            }
                                        }
                                    })
                                })
                            }

                            if (!isSelectedChat) {
                                const lastReadTime = chat?.metaTimestamps?.lastReadTime

                                console.log("hit")

                                const prevDate = previousMessageData?.createdAt
                                const prevSender = previousMessageData?.sender
                                const markAsUnread =
                                    !lastReadTime ||
                                    lastReadTime >= prevDate ||
                                    prevSender === userId ||
                                    !prevDate

                                console.log(chat?.metaTimestamps?.lastReadTime)

                                if (markAsUnread) updateUnreadChatsCount(1)
                            } else {
                                if (typingTimeouts.current[senderId]) {
                                    clearTimeout(typingTimeouts.current[senderId])
                                    delete typingTimeouts.current[senderId]

                                    setActiveTypingUsers((prev) =>
                                        prev.filter((u) => u._id !== senderId)
                                    )
                                }

                                if (
                                    !selectedChat?.chatId &&
                                    selectedChatRef.current === selectedChat
                                )
                                    updateSelectedChatData({ chatId: chat._id })
                            }

                            const queryMessagesState = queryClient.getQueryState([
                                "messages",
                                message.chat,
                            ])
                            const queue = pendingEventsRef.current.get(message.chat) || []
                            if (queryMessagesState?.fetchStatus === "fetching") {
                                queue.push({ type: "newMessage", data: message })
                                pendingEventsRef.current.set(message.chat, queue)
                            } else {
                                const deletionTime = chat?.metaTimestamps?.deletionTime
                                const prevMessageDate = d.data.previousMessageData?.createdAt

                                const cursor =
                                    (!deletionTime || prevMessageDate > deletionTime) &&
                                    prevMessageDate
                                addMessageToCache(message.chat, message, cursor)
                            }
                        })
                        .catch(console.error)
                }

                messageSeenHandler = (d) => {
                    const { readUserData, chatId } = d.data

                    queryClient.setQueryData(["messages", chatId], (oldData) => {
                        return produce(oldData, (draft) => {
                            if (!oldData) return

                            const latestPage = draft.pages[0]
                            const readUsers = latestPage.readUsers
                            const latestMessage = latestPage.messages?.at(-1)
                            const lmSender = latestMessage?.sender?._id || latestMessage?.sender

                            if (!latestMessage || lmSender !== userId) return

                            if (readUsers) {
                                readUsers.displayed.push(readUserData)
                            } else {
                                latestPage.readUsers = {
                                    displayed: [readUserData],
                                    othersCount: 0,
                                }
                            }
                        })
                    })
                }

                deletedMessageHandler = (d) => {
                    const { deletedMessage, chatId } = d.data

                    const queryMessagesState = queryClient.getQueryState(["messages", chatId])
                    const queue = pendingEventsRef.current.get(deletedMessage.chat) || []

                    if (queryMessagesState?.fetchStatus === "fetching") {
                        queue.push({ type: "deletedMessage", data: deletedMessage })
                        pendingEventsRef.current.set(deletedMessage.chat, queue)
                    } else {
                        deleteMessageFromCache(deletedMessage, chatId)
                    }
                }

                channel.subscribe("newMessage", newMessageHandler)
                channel.subscribe("deletedMessage", deletedMessageHandler)
                channel.subscribe("messageSeen", messageSeenHandler)
            }
        })

        return () => {
            if (client) client.close()
            if (channel) {
                channel.unsubscribe("newMessage", newMessageHandler)
                channel.unsubscribe("deletedMessage", deletedMessageHandler)
                channel.unsubscribe("messageSeen", messageSeenHandler)
            }
        }
    }, [authToken, userId])

    useEffect(() => {
        setActiveTypingUsers([])
        setActiveMessageMenu({})
        typingTimeouts.current = {}

        if (!ablyClient || ablyClient?.connection?.state !== "connected" || !userId) return

        const roomId = selectedChatData?.privateChatKey || selectedChatData?.chatId
        if (!roomId) return

        const chatChannel = ablyClient.channels.get(`chat:${roomId}`)

        const localTimeouts = { ...typingTimeouts.current }

        const onTyping = (d) => {
            const typer = d.data.userData._id
            const uData = d.data.userData
            if (typer === userId) return

            setActiveTypingUsers((prev) =>
                prev.find((t) => t?._id === typer) ? prev : [...prev, uData]
            )

            if (typingTimeouts.current[typer]) clearTimeout(typingTimeouts.current[typer])

            const timeout = setTimeout(() => {
                setActiveTypingUsers((prev) => prev.filter((u) => u?._id !== typer))
                delete typingTimeouts.current[typer]
            }, 3000)

            typingTimeouts.current[typer] = timeout
            localTimeouts[typer] = timeout
        }

        chatChannel.subscribe("typing", onTyping)

        return () => {
            chatChannel.unsubscribe("typing", onTyping)
            Object.values(localTimeouts).forEach((t) => clearTimeout(t))
        }
    }, [ablyClient, selectedChatData, userId])

    return (
        <ChatContext.Provider
            value={{
                activeTypingUsers,
                activeMessageMenu,
                ablyClient,
                selectedChatData,
                updateSelectedChatData,
                addMessageToCache,
                deleteMessageFromCache,
                deleteChatInCache,
                removeUserFromChat,
                flushPendingEvents,
                updateUnreadChatsCount,
                updateActiveTypingUsers,
                updateActiveMessageMenu,
                selectedMessageId,
                setSelectedMessageId,
                updateLatestMessage,
            }}
        >
            {children}
        </ChatContext.Provider>
    )
}

export default ChatContext
