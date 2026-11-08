import React, {
    Fragment,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useSelector } from "react-redux"
import { v4 as uuidV4 } from "uuid"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import useChats from "../hooks/chats/useChats"
import useMessages from "../hooks/chats/useMessages"
// import MessageBubble from "./MessageBubble"
import {
    useInfiniteQuery,
    useMutation,
    useMutationState,
    useQueryClient,
} from "@tanstack/react-query"
import ChatContext from "../contexts/ChatContext"
import { useInView } from "react-intersection-observer"
import { produce } from "immer"
import Spinner from "./Spinner"
import { MdOutlinePermMedia as MediaIcon } from "react-icons/md"
// import Preview from "./Preview"
import { last, throttle } from "lodash"
// import MediaPreviewFullscreen from "./MediaPreviewFullscreen"
// import ChatSettings from "./ChatSettings"
import Reply from "./Reply"
import usePendingMutations from "../hooks/usePendingMutations"
import PQueue from "p-queue"
import { getChatUsernames, getSenderInfo, retrieveTypingUsers } from "../utils/chatHelper"
import MessageBubble from "./MessageBubble"
import dayjs from "dayjs"
import Preview from "./Preview"
import ProfilePic from "./ProfilePic"
import ChatSettings from "./ChatSettings"
import { useNavigate } from "react-router-dom"
import { MdArrowBackIos as BackIcon, MdOutlineChatBubbleOutline } from "react-icons/md"

const ChatWindow = ({ chats, isMobile, selectedChatData, updateSelectedChatData }) => {
    const userId = useSelector((state) => state.auth.userData?._id)
    const userData = useSelector((state) => state.auth.userData)
    const selectedChat = chats?.find((c) => c._id === selectedChatData?.chatId)
    const chatUsers = selectedChat?.users || selectedChatData?.newChatData?.selectedUsers
    const otherUser = chatUsers?.find((u) => u?._id !== userId)
    const chatUsernames = selectedChat?.chatTitle || getChatUsernames(chatUsers, userId)
    const axiosPrivate = useAxiosPrivate()
    const { createChatMutation } = useChats()
    const { fetchMessages, createMessage } = useMessages()
    const [previewData, setPreviewData] = useState({ type: null, url: null, error: null })
    const [mediaPreviewData, setMediaPreviewData] = useState({ type: null, fileName: null })
    const [pendingNextPageFetch, setPendingNextPageFetch] = useState(false)
    const [reply, setReply] = useState()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const { updateLatestMessage, flushPendingEvents, activeTypingUsers } = useContext(ChatContext)
    const messageTextRef = useRef("")
    const messageFileRef = useRef()
    const messageQueue = useRef(new PQueue({ concurrency: 1 }))
    const endRef = useRef()
    const { isPendingMutations } = usePendingMutations(["messages", "create"])
    const typingText = retrieveTypingUsers(
        activeTypingUsers,
        chatUsers,
        selectedChatData?.privateChatKey === ""
    )

    const { ablyClient } = useContext(ChatContext)

    const {
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage,
        isFetching,
        data: messages,
    } = useInfiniteQuery({
        queryKey: ["messages", selectedChatData?.chatId],
        queryFn: fetchMessages,
        initialPageParam: selectedChat?.latestMessage?.createdAt || new Date().toISOString(),
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        enabled: !!selectedChatData?.chatId,
        select: (data) => ({
            pages: [...data.pages].reverse(),
            pageParams: [...data.pageParams].reverse(),
        }),
    })
    const isSendDisabled =
        (isFetching && !isFetchingNextPage) ||
        (!selectedChatData?.chatId && !selectedChatData?.newChatData)
    const { ref: pageFetcherRef } = useInView({
        threshold: 0,
        skip: isFetchingNextPage || !hasNextPage || !selectedChatData?.chatId,
        onChange: (inView) => {
            if (inView && hasNextPage && !isFetchingNextPage && selectedChatData?.chatId) {
                if (isPendingMutations) setPendingNextPageFetch(true)
                else fetchNextPage()
            }
        },
    })
    const createMessageMutation = useMutation({
        mutationKey: ["messages", "create"],
        mutationFn: ({ messageText, chatId, file, reply }) =>
            createMessage({ messageText, chatId, file, reply }),
        onMutate: async () => {
            const wasFetchingNextPage = isFetchingNextPage
            if (wasFetchingNextPage && selectedChatData?.chatId)
                await queryClient.cancelQueries({
                    queryKey: ["messages", selectedChatData?.chatId],
                })
        },
        onSuccess: (newMessage, variables) => {
            const { chatId, pendingMessage } = variables
            const pendingFileData = pendingMessage.pendingFileData

            // handleTyping.cancel()

            queryClient.setQueryData(["messages", selectedChatData?.chatId], (oldData) => {
                return produce(oldData, (draft) => {
                    const latestPage = draft?.pages?.[0]
                    if (!latestPage) return

                    const messageIndex = latestPage?.messages?.findIndex(
                        (m) => m._id === pendingMessage._id
                    )
                    if (messageIndex === -1) return

                    if (pendingFileData.tempImageUrl) {
                        latestPage.messages[messageIndex] = {
                            ...newMessage,
                            pendingFileData,
                        }
                    } else {
                        latestPage.messages[messageIndex] = { ...newMessage }
                    }
                })
            })

            // updateLatestMessage(chatId, newMessage)
        },
        onError: (err, variables, __) => {
            const { chatId, pendingMessage } = variables
            const messageErrorObj = { ...pendingMessage, status: "error" }

            console.log(err)

            queryClient.setQueryData(["messages", selectedChatData?.chatId], (oldData) => {
                if (!oldData) return oldData

                return produce(oldData, (draft) => {
                    const latestPage = draft.pages[0]
                    if (!latestPage) return

                    const messageIndex = latestPage?.messages?.findIndex(
                        (m) => m._id === pendingMessage._id
                    )
                    if (messageIndex === -1) return
                    latestPage.messages[messageIndex] = messageErrorObj
                })
            })
        },
    })

    const getSeenByText = () => {
        if (!messages?.pages?.[0]?.messages?.length) return null

        const latestMessage = messages.pages[0].messages[messages.pages[0].messages.length - 1]
        const readUsers = messages.pages[0].readUsers

        // Debug logging

        // Only show if the latest message is from current user and there are readers
        if (
            (latestMessage?.sender?._id || latestMessage?.sender) !== userId ||
            !readUsers?.displayed?.length ||
            latestMessage?.isAdmin
        )
            return null

        const { displayed, othersCount } = readUsers
        const usernames = displayed.map((user) => user.username)

        console.log("Debug usernames:", usernames)

        let seenText = "Seen by "

        if (usernames.length === 1) {
            seenText += usernames[0]
        } else if (usernames.length === 2) {
            seenText += `${usernames[0]} and ${usernames[1]}`
        } else if (usernames.length > 2) {
            seenText += `${usernames[0]}, ${usernames[1]} and ${usernames.length - 2} other${
                usernames.length - 2 > 1 ? "s" : ""
            }`
        }

        if (othersCount > 0) {
            seenText += ` and ${othersCount} other${othersCount > 1 ? "s" : ""}`
        }

        console.log("Debug final seenText:", seenText)
        return seenText
    }
    const seenByText = getSeenByText()

    const updateMediaPreviewData = (data) => setMediaPreviewData(data)
    const updateReply = (messageData) => {
        const data = messageData && {
            _id: messageData._id,
            messageText: messageData.messageText,
            fileName: messageData.fileName,
            sender: messageData.sender,
        }

        const isPrivateChat = typeof data?.sender === "string"
        if (isPrivateChat) {
            const targetUserData = chatUsers.find((u) => u._id === data.sender)
            if (!targetUserData) return

            data.sender = targetUserData
        }

        setReply(data)
    }

    const updateUserReadTimestamp = useCallback(() => {
        if (!selectedChat?._id) return

        queryClient.setQueryData(["chats"], (prevChats) => {
            return prevChats.map((c) => {
                if (c._id !== selectedChat?._id) return c
                return {
                    ...c,
                    metaTimestamps: {
                        ...c.metaTimestamps,
                        lastReadTime: new Date().toISOString(),
                    },
                }
            })
        })

        axiosPrivate
            .put(`${BASE_URL}/api/chats/update_chat_read_timestamp/${selectedChat?._id}`)
            .catch((err) => console.log(err))
    }, [axiosPrivate, queryClient, selectedChat?._id, userId])

    const handleSendMessage = async () => {
        const messageText = messageTextRef.current?.value
        const file = messageFileRef.current?.files?.[0]

        console.log(messageText, "   ", file)

        if (!messageText && !file) return
        let chatId = selectedChatData.chatId

        if (!chatId) {
            const otherUserId = selectedChatData.newChatData?.selectedUsers[0]._id
            const chatParticipantIds = [userId, otherUserId]
            const privateChatKey = selectedChatData.privateChatKey

            const chat = await createChatMutation.mutateAsync(chatParticipantIds)
            chatId = chat._id
            updateSelectedChatData({ chatId, privateChatKey, shouldFetchMessages: false })
        }

        const tempMessageId = uuidV4()
        const isImage = file && file.type.includes("image")
        const isVideo = file && file.type.includes("video")

        const pendingFileData = messageFileRef.current && {
            ...(isImage && { tempImageUrl: previewData.url }),
            type: isImage ? "image" : isVideo ? "video" : null,
        }

        const pendingMessage = {
            _id: tempMessageId,
            pendingFileData,
            messageText,
            ...(reply && { reply }),
            chat: chatId,
            status: "sending",
            sender: {
                _id: userId,
                username: userData?.username,
                profilePic: userData?.profilePic,
            },
        }

        queryClient.setQueryData(["messages", chatId], (oldData) => {
            return produce(oldData, (draft) => {
                if (!oldData) {
                    // Initialize the data structure for new chats
                    return {
                        pages: [
                            {
                                messages: [pendingMessage],
                                nextCursor: null,
                            },
                        ],
                        pageParams: [null],
                    }
                }

                const latestPage = draft.pages[0]
                latestPage.messages.push(pendingMessage)
                latestPage.readUsers = { displayed: [], othersCount: 0 }
            })
        })

        updateLatestMessage(chatId, pendingMessage)

        resetMessageState()

        const scrollTo = endRef.current?.offsetTop
        if (scrollTo) endRef.current.scrollTop = scrollTo

        handleTyping.cancel()

        messageQueue.current.add(() =>
            createMessageMutation.mutateAsync({
                messageText,
                chatId,
                file,
                reply: reply?._id,
                pendingMessage,
            })
        )
    }

    const handleMessageFileChange = () => {
        const file = messageFileRef.current?.files?.[0]
        if (!file) return

        const type = file.type.includes("image") ? "image" : "video"
        const data = { type, url: type === "image" && URL.createObjectURL(file), error: null }
        setPreviewData(data)
    }

    const handleRemoveMessageFile = () => {
        setPreviewData({ url: null, error: null })
        messageFileRef.current.value = ""
    }

    const resetMessageState = () => {
        setReply(null)
        handleRemoveMessageFile()
        messageTextRef.current.value = ""
    }

    const handleTyping = useMemo(() => {
        if (!ablyClient) return

        return throttle(
            () => {
                const roomId = selectedChatData?.privateChatKey || selectedChatData?.chatId
                const room = ablyClient.channels.get(`chat:${roomId}`)
                room.publish("typing", {
                    userData: {
                        _id: userId,
                        username: userData?.username,
                        profilePic: userData?.profilePic,
                    },
                })
            },
            750,
            { leading: false }
        )
    }, [selectedChatData?.chatId, selectedChatData?.privateChatKey, userId, ablyClient])

    useEffect(() => {
        if (!selectedChat?._id) return

        const lastMessage = selectedChat?.latestMessage
        const isGroupChat = selectedChat?.privateChatKey === ""
        const lastMessageSender = getSenderInfo(lastMessage, !isGroupChat && selectedChat?.users)
        const userLatestReadTimestamp =
            selectedChat?.metaTimestamps?.lastReadTime ?? new Date(0).toISOString()

        if (lastMessage?.chat !== selectedChat?._id || !selectedChat?._id) return

        if (userLatestReadTimestamp < lastMessage.createdAt && lastMessageSender._id !== userId) {
            updateUserReadTimestamp()
        }
    }, [axiosPrivate, updateUserReadTimestamp, userId, selectedChat])

    useEffect(() => {
        if (isFetching || !selectedChat?._id) return
        flushPendingEvents(selectedChat?._id)
    }, [isFetching, selectedChat?._id, flushPendingEvents])

    useEffect(() => {
        if (!isPendingMutations && pendingNextPageFetch && selectedChatData?.chatId) fetchNextPage()
    }, [isPendingMutations, pendingNextPageFetch, selectedChatData?.chatId])

    useEffect(() => {
        if (!isFetchingNextPage) setPendingNextPageFetch(false)
    }, [isFetchingNextPage, selectedChatData?.chatId])

    const { selectedMessageId, setSelectedMessageId, deleteMessageFromCache } =
        useContext(ChatContext)
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })

    const handleMessageContextMenu = (e, m) => {
        if (m.status === "sending") return
        e.preventDefault()
        setSelectedMessageId(m._id)

        // Get chat window container dimensions
        const chatWindowContainer = e.currentTarget.closest('[style*="chatWindowContainer"]')
        const containerRect = chatWindowContainer?.getBoundingClientRect()

        if (containerRect) {
            // Center the menu in the chat window
            const menuWidth = 180
            const menuHeight = 80
            const centerX = containerRect.left + containerRect.width / 2 - menuWidth / 2
            const centerY = containerRect.top + containerRect.height / 2 - menuHeight / 2

            setContextMenu({
                visible: true,
                x: centerX,
                y: centerY,
            })
        } else {
            // Fallback to original position
            setContextMenu({ visible: true, x: e.clientX, y: e.clientY })
        }
    }

    useEffect(() => {
        if (!contextMenu.visible) return
        const handleClick = () => {
            setContextMenu({ ...contextMenu, visible: false })
            setSelectedMessageId(null)
        }
        window.addEventListener("click", handleClick)
        return () => window.removeEventListener("click", handleClick)
    }, [contextMenu.visible])

    const selectedMessage = useMemo(() => {
        if (!selectedMessageId) return null
        for (const page of messages?.pages || []) {
            const found = page.messages.find((m) => m._id === selectedMessageId)
            if (found) return found
        }
        return null
    }, [selectedMessageId, messages])

    // Delete message handler
    const handleDeleteMessage = async () => {
        if (!selectedMessage) return
        try {
            await axiosPrivate.delete(
                `/api/messages/${selectedMessage._id}/${selectedChatData?.chatId}`
            )
            deleteMessageFromCache(selectedMessage, selectedChatData?.chatId)
        } catch (err) {
            console.error("Failed to delete message:", err)
        } finally {
            setContextMenu({ ...contextMenu, visible: false })
            setSelectedMessageId(null)
        }
    }

    return selectedChatData?.chatId || selectedChatData?.newChatData ? (
        <div style={styles.chatWindowContainer}>
            <div style={styles.topbar}>
                <div className='d-flex w-100 align-items-center'>
                    {/* {isMobile && (
                        <ArrowBack
                            style={{ width: 24, height: 24, marginLeft: 22, marginTop: 2 }}
                            onClick={() => updateSelectedChatData(null)}
                        />
                    )} */}

                    {isMobile && (
                        <button
                            type='button'
                            aria-label='Back to conversations'
                            onClick={() => updateSelectedChatData(null)}
                            style={{ marginTop: 4, marginLeft: 12, flexShrink: 0, cursor: "pointer", background: "none", border: 0, color: "var(--text)", padding: 0 }}
                        >
                            <BackIcon size={22} />
                        </button>
                    )}

                    {/* Profile Picture */}
                    <ProfilePic
                        size={40}
                        src={
                            selectedChat?.privateChatKey && otherUser?.profilePic
                                ? `${BASE_URL}/uploads/profilePics/${otherUser.profilePic}`
                                : !selectedChat?.privateChatKey &&
                                  selectedChat?.chatPicture &&
                                  `${BASE_URL}/uploads/profilePics/${selectedChat.chatPicture}`
                        }
                        style={{ marginLeft: isMobile ? 12 : 40, marginTop: 10 }}
                    />

                    <span style={styles.topbarUsersText}>{chatUsernames}</span>
                    <ChatSettings chatData={selectedChat} />
                </div>
            </div>

            <div
                ref={endRef}
                style={{ ...styles.messageListContainer, ...(isMobile && { padding: "20px 12px" }) }}
            >
                <div
                    style={{ position: "relative" }}
                    className='d-flex flex-column gap-3'
                >
                    <div ref={pageFetcherRef} />

                    {(isFetching || pendingNextPageFetch) && (
                        <div
                            style={styles.messagesLoaderContainer}
                            className='d-flex justify-content-center'
                        >
                            <Spinner
                                withStyles={false}
                                size={32}
                            />
                        </div>
                    )}

                    {messages?.pages?.map((page, pageIndex) => {
                        // const nextPage = messages.pages[pageIndex + 1]
                        // const isLatestPage = pageIndex === messages.pages.length - 1

                        return (
                            <Fragment key={pageIndex}>
                                {page.messages.map((m, messageIndex) => {
                                    // const isLastMessage = messageIndex === page.messages.length - 1
                                    // const prevMessage = page.messages[messageIndex - 1]
                                    // const nextMessage = !isLastMessage
                                    //     ? page.messages[messageIndex + 1]
                                    //     : nextPage?.messages?.[0]

                                    return (
                                        <div
                                            key={m._id}
                                            // onContextMenu={(e) => handleMessageContextMenu(e, m)}
                                            style={{ display: "contents" }}
                                        >
                                            <MessageBubble
                                                selectedChat={selectedChat}
                                                authUserId={userId}
                                                handleMessageContextMenu={handleMessageContextMenu}
                                                m={m}
                                                updateReply={updateReply}
                                            />
                                        </div>
                                    )
                                })}
                            </Fragment>
                        )
                    })}

                    {/* Seen by indicator */}
                    {seenByText && (
                        <div style={styles.seenByContainer}>
                            <span style={styles.seenByText}>{seenByText}</span>
                        </div>
                    )}

                    {/* 
                    <MediaPreviewFullscreen
                        mediaPreviewData={mediaPreviewData}
                        updateMediaPreviewData={updateMediaPreviewData}
                    /> */}

                    <div style={styles.typingTextContainer}>
                        <span style={styles.typingText}>{typingText}</span>
                    </div>
                </div>
            </div>

            <div style={{ ...styles.inputWrapper, ...(isMobile && { padding: "0 12px", marginBottom: 8 }) }}>
                {/* Reply box above input */}
                {reply && (
                    <Reply
                        reply={reply}
                        onCancel={() => setReply(null)}
                    />
                )}
                <div className='d-flex gap-2'>
                    <Preview
                        previewData={previewData}
                        handleRemoveMessageFile={handleRemoveMessageFile}
                    />

                    {/* {reply && (
                        <div style={styles.replyContainer}>
                            <Reply
                                type={"message"}
                                reply={reply}
                                updateReply={updateReply}
                            />
                        </div>
                    )} */}
                </div>

                <div style={styles.inputContainer}>
                    <input
                        ref={messageTextRef}
                        onChange={handleTyping}
                        placeholder='Message...'
                        style={styles.inputStyle}
                        onKeyUp={(e) => e.key === "Enter" && !isSendDisabled && handleSendMessage()}
                    />
                    <div
                        style={styles.iconsContainer}
                        className='d-flex align-items-center'
                    >
                        <label htmlFor='fileSelectMessages'>
                            <input
                                onChange={handleMessageFileChange}
                                ref={messageFileRef}
                                accept='image/png, image/jpeg, image/gif, video/mp4'
                                type='file'
                                hidden
                                id='fileSelectMessages'
                            />
                            <MediaIcon style={styles.mediaIcon} />
                        </label>

                        <span
                            onClick={!isSendDisabled ? handleSendMessage : null}
                            style={{
                                ...styles.sendText,
                                ...(isSendDisabled && { color: "var(--lightGrey)" }),
                            }}
                        >
                            Send
                        </span>
                    </div>
                </div>
            </div>

            {contextMenu.visible && selectedMessage && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.5)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        setContextMenu({ ...contextMenu, visible: false })
                        setSelectedMessageId(null)
                    }}
                >
                    <div
                        style={{
                            background: "#222",
                            color: "#fff",
                            borderRadius: 12,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                            minWidth: 200,
                            padding: 20,
                            textAlign: "center",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                fontSize: 13,
                                color: "#aaa",
                                marginBottom: 16,
                            }}
                        >
                            {dayjs(selectedMessage.createdAt).format("MMM D, YYYY h:mm A")}
                        </div>
                        {selectedMessage.sender === userId ||
                        selectedMessage.sender?._id === userId ? (
                            <div
                                style={{
                                    color: "#fff",
                                    cursor: "pointer",
                                    padding: "8px 16px",
                                    borderRadius: 6,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    transition: "background 0.2s",
                                    marginBottom: 8,
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = "#333"
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = "transparent"
                                }}
                                onClick={handleDeleteMessage}
                            >
                                Delete Message
                            </div>
                        ) : null}
                        <div
                            style={{
                                color: "#fff",
                                cursor: "pointer",
                                padding: "8px 16px",
                                borderRadius: 6,
                                fontSize: 14,
                                fontWeight: 700,
                                transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = "#333"
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = "transparent"
                            }}
                            onClick={() => {
                                updateReply(selectedMessage)
                                setContextMenu({ ...contextMenu, visible: false })
                                setSelectedMessageId(null)
                            }}
                        >
                            Reply
                        </div>
                    </div>
                </div>
            )}
        </div>
    ) : (
        <div style={styles.emptyState}>
            <MdOutlineChatBubbleOutline size={40} aria-hidden='true' />
            <h2 style={styles.emptyStateTitle}>Your conversations</h2>
            <p style={styles.emptyStateDescription}>
                Select a conversation or start a new one to begin messaging.
            </p>
        </div>
    )
}

const styles = {
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        width: "100%",
        padding: "32px",
        textAlign: "center",
        color: "var(--text-muted)",
    },
    emptyStateTitle: {
        margin: "16px 0 8px",
        fontSize: 20,
        color: "var(--text)",
    },
    emptyStateDescription: {
        margin: 0,
        maxWidth: 320,
        lineHeight: 1.5,
    },
    chatWindowContainer: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
    },
    iconsContainer: {
        paddingLeft: 20,
    },
    replyContainer: {
        flexGrow: 1,
        maxWidth: "95%",
        marginLeft: "auto",
        alignSelf: "end",
    },
    typingTextContainer: {
        position: "relative",
        marginTop: 15,
        display: "flex",
        alignItems: "center",
        height: "auto",
        marginLeft: 30,
    },
    typingText: {
        position: "absolute",
        top: -5,
        fontSize: 13,
        color: "#BEBEBE",
    },
    mediaIcon: {
        width: 25,
        height: 25,
    },
    inputStyle: {
        width: "100%",
        minWidth: 0,
        textIndent: 20,
        height: "42px",
        color: "white",
        flexGrow: 1,
        backgroundColor: "var(--darkGrey3)",
        borderRadius: 50,
        border: "1px solid transparent",
    },
    messagesLoaderContainer: {
        paddingBottom: 35,
    },
    topbar: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 80,
        position: "relative",
        borderBottom: "1px solid var(--darkGrey2)",
    },
    topbarUsersText: {
        marginLeft: 15,
        marginTop: 2,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    messageListContainer: {
        flexGrow: 1,
        minHeight: 0,
        display: "flex",
        padding: "35px 35px 35px 20px",
        flexDirection: "column-reverse",
        overflowY: "auto",
        overflowAnchor: "none",
        overflowX: "hidden",
    },
    sendText: {
        padding: "0 25px 0 18px",
        fontSize: 15,
        color: "var(--primary)",
    },
    inputWrapper: {
        width: "100%",
        minWidth: 200,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        maxHeight: 200,
        gap: 2,
        marginBottom: 20,
        padding: "0 30px",
    },
    inputContainer: {
        width: "100%",
        backgroundColor: "var(--darkGrey3)",
        border: "1px solid var(--darkGrey2)",
        borderRadius: 50,
        alignItems: "center",
        alignSelf: "end",
        display: "flex",
        position: "relative",
    },
    seenByContainer: {
        display: "flex",
        justifyContent: "flex-end",
        marginRight: 15,
        marginBottom: 15,
    },
    seenByText: {
        fontSize: 12,
        color: "#888",
        fontStyle: "italic",
    },
}

export default ChatWindow
