import React, { useEffect, useState, useContext } from "react"
import { BASE_URL, SMALL_SCREEN_SIZE } from "../utils/config"
import { useMediaQuery } from "react-responsive"
import useChats from "../hooks/chats/useChats"
import CreateChat from "../components/CreateChat"
import { useSelector } from "react-redux"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ProfilePic from "../components/ProfilePic"
import ChatWindow from "../components/ChatWindow"
import { getAdminMessageText, getChatUsernames, getSenderInfo } from "../utils/chatHelper"
import UnauthorizedLoginPopupModal from "../components/UnauthorizedLoginPopupModal"
import { useLocation, useNavigate } from "react-router-dom"
import ChatContext from "../contexts/ChatContext"
import { MdArrowBackIos as BackIcon } from "react-icons/md"

const Chats = () => {
    const queryClient = useQueryClient()
    const userId = useSelector((state) => state.auth.userData?._id)
    const token = useSelector((state) => state.auth.token)
    const { fetchChats, useUnreadChatsQuery } = useChats()
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })
    const [showLoginModal, setShowLoginModal] = useState(false)
    const location = useLocation()
    const inquiredUser = location.state?.targetUserInfo
    const { selectedChatData, updateSelectedChatData, updateUnreadChatsCount } =
        useContext(ChatContext)
    const navigate = useNavigate()

    const displayChatWindow = isMobile
        ? selectedChatData?.privateChatKey || selectedChatData?.chatId
        : true
    const displayNavbar = isMobile
        ? !selectedChatData?.privateChatKey && !selectedChatData?.chatId
        : true

    // const { isLoading: isLoadingChatCount } = useUnreadChatsQuery()
    const { data, isFetching } = useQuery({
        queryKey: ["chats"],
        queryFn: fetchChats,
        staleTime: Infinity,
        enabled: !!token, // Only fetch chats if user is authenticated
        // enabled: !isLoadingChatCount,
    })

    const handleChatClick = (chat, markUnread) => {
        if (!token) {
            setShowLoginModal(true)
            return
        }
        markUnread && updateUnreadChatsCount(-1)
        updateSelectedChatData({ chatId: chat._id })
    }

    useEffect(() => {
        const resetState = () => {
            return navigate(`/chats`, { replace: true }, { state: null })
        }

        window.addEventListener("beforeunload", resetState)

        return () => window.removeEventListener("beforeunload", resetState)
    }, [navigate])

    useEffect(() => {
        if (isFetching || !inquiredUser) return

        const sortedChatParticipants = [inquiredUser?._id, userId].sort()
        const privateChatKey = `${sortedChatParticipants[0]}-${sortedChatParticipants[1]}`

        const chat = data?.find((c) => c.privateChatKey === privateChatKey)
        if (chat) updateSelectedChatData({ chatId: chat._id })
        else
            updateSelectedChatData({
                privateChatKey,
                newChatData: { selectedUsers: [inquiredUser] },
            })
    }, [isFetching, data, inquiredUser, updateSelectedChatData, userId])

    // Show login modal if not authenticated
    if (!token) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100vh",
                    flexDirection: "column",
                    gap: "20px",
                }}
            >
                <h2 style={{ color: "#fff", margin: 0 }}>Messages</h2>
                <p style={{ color: "#aaa", margin: 0 }}>Please login to access messages.</p>
                <UnauthorizedLoginPopupModal
                    isOpen={showLoginModal}
                    onClose={() => setShowLoginModal(false)}
                    title='Login Required'
                    message='Please login to access messages.'
                />
            </div>
        )
    }

    return (
        <div className='page-wrapper chats-page' style={{ padding: isMobile ? 0 : undefined, maxWidth: '100%' }}>
            <div className='chat-layout' style={isMobile ? { height: 'calc(100vh - 56px)', marginTop: '56px', width: '100vw', maxWidth: '100vw' } : { height: 'calc(100vh - 80px)' }}>
                {displayNavbar && (
                    <aside className='chat-sidebar-panel' style={isMobile ? { width: '100%', maxWidth: '100%', height: '100%', borderRadius: 0, border: 'none' } : {}}>
                        <div style={styles.headerContainer}>
                            {isMobile && (
                                <BackIcon
                                    onClick={() => navigate(-1)}
                                    style={{ marginTop: 2 }}
                                    size={20}
                                />
                            )}
                            <div>
                                <span
                                    className='page-title'
                                    style={{ fontSize: 22 }}
                                >
                                    Messages
                                </span>
                                <p
                                    className='page-subtitle'
                                    style={{ marginTop: 4 }}
                                >
                                    Live conversations and chat updates.
                                </p>
                            </div>
                            <div style={{ marginLeft: "auto" }}>
                                <CreateChat updateSelectedChatData={updateSelectedChatData} />
                            </div>
                        </div>
                        <div className='chat-list-container'>
                            {data?.map((c, index) => {
                                const isGroupChat = !c?.privateChatKey
                                const chatTitle = c.chatTitle || getChatUsernames(c.users, userId)
                                const senderInfo = getSenderInfo(
                                    c.latestMessage,
                                    !isGroupChat && c.users,
                                )

                                const otherUser =
                                    !isGroupChat && c.users.find((u) => u._id !== userId)
                                const latestMessage = c?.latestMessage

                                const getLatestMessageText = () => {
                                    if (!latestMessage) return ""

                                    // Handle shared content
                                    if (latestMessage.journeyPost) {
                                        // For journey posts, just return the action text
                                        // Username will be prepended separately in the chat list
                                        return isGroupChat
                                            ? "shared a journey"
                                            : `${
                                                  senderInfo._id === userId
                                                      ? "You"
                                                      : senderInfo.username
                                              } shared a journey`
                                    } else if (latestMessage.sharedCommunity) {
                                        // For community shares, just return the action text
                                        // Username will be prepended separately in the chat list
                                        return isGroupChat
                                            ? "shared a community"
                                            : `${
                                                  senderInfo._id === userId
                                                      ? "You"
                                                      : senderInfo.username
                                              } shared a community`
                                    } else if (latestMessage.sharedStory) {
                                        // For story shares, just return the action text
                                        // Username will be prepended separately in the chat list
                                        return isGroupChat
                                            ? "shared a story"
                                            : `${
                                                  senderInfo._id === userId
                                                      ? "You"
                                                      : senderInfo.username
                                              } shared a story`
                                    } else if (latestMessage.isAdmin) {
                                        return getAdminMessageText(latestMessage)
                                    }

                                    return latestMessage.messageText
                                }
                                const latestMessageText = getLatestMessageText()
                                const isChatRead =
                                    !latestMessage ||
                                    senderInfo._id === userId ||
                                    c.metaTimestamps?.lastReadTime >= latestMessage?.createdAt

                                const isSelected =
                                    c._id === selectedChatData?.chatId ||
                                    c.privateChatKey ===
                                        selectedChatData?.newChatData?.privateChatKey

                                return (
                                    <div
                                        className={`chat-item ${isSelected ? "selected" : ""}`}
                                        onClick={() => handleChatClick(c, !isChatRead)}
                                        key={c._id}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 13,
                                                minWidth: 0, // Allow flex container to shrink
                                            }}
                                        >
                                            <ProfilePic
                                                src={
                                                    isGroupChat
                                                        ? `${BASE_URL}/uploads/profilePics/${c?.chatPicture}`
                                                        : `${BASE_URL}/uploads/profilePics/${otherUser?.profilePic}`
                                                }
                                                size={44}
                                            />

                                            <div
                                                style={{
                                                    display: "flex",
                                                    marginTop: 5,
                                                    fontWeight: !isChatRead ? "bold" : "normal",
                                                    flexDirection: "column",
                                                    flex: 1,
                                                    minWidth: 0, // Allow flex item to shrink below content size
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 15,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                    title={chatTitle}
                                                >
                                                    {chatTitle}
                                                </span>
                                                <span
                                                    style={{
                                                        ...styles.latestMessageText,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                    title={`${
                                                        isGroupChat && senderInfo._id
                                                            ? (senderInfo._id === userId
                                                                  ? "You"
                                                                  : senderInfo.username) +
                                                              (latestMessage?.isAdmin ? " " : ": ")
                                                            : ""
                                                    }${latestMessageText || ""}`}
                                                >
                                                    {isGroupChat && senderInfo._id && (
                                                        <>
                                                            {senderInfo._id === userId
                                                                ? "You"
                                                                : senderInfo.username}
                                                            {!latestMessage?.isAdmin ? ": " : " "}
                                                        </>
                                                    )}
                                                    {latestMessageText}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </aside>
                )}

                {displayChatWindow && (
                    <main className='chat-main-panel' style={isMobile ? { width: '100vw', maxWidth: '100vw', height: 'calc(100vh - 56px)', marginTop: '56px', borderRadius: 0, border: 'none' } : {}}>
                        <div className='chat-header-panel'>
                            <div>
                                <span
                                    className='page-title'
                                    style={{ fontSize: 22 }}
                                >
                                    Conversation
                                </span>
                                <p
                                    className='page-subtitle'
                                    style={{ marginTop: 4 }}
                                >
                                    Smart, spacious messaging with cleaner focus.
                                </p>
                            </div>
                        </div>
                        <div style={styles.chatWindowWrapper}>
                            <ChatWindow
                                isMobile={isMobile}
                                selectedChatData={selectedChatData}
                                updateSelectedChatData={updateSelectedChatData}
                                key={selectedChatData?.privateChatKey || selectedChatData?.chatId}
                                chats={data}
                            />
                        </div>
                    </main>
                )}
            </div>
        </div>
    )
}

    const styles = {
        navbarStyle: {
            width: 300,
            color: "white",
            backgroundColor: "black",
            borderRight: "1px solid var(--lightGrey)",
            height: "100vh",
            overflow: "auto",
        },
        mobileNavbarStyle: {
            width: "100%",
            color: "white",
            backgroundColor: "black",
            borderRight: "1px solid var(--lightGrey)",
            height: "100vh",
            overflow: "auto",
        },
        latestMessageText: {
            fontSize: 14,
            color: "var(--test)",
        },
        chatListContainer: {
            width: "100%",
            marginTop: 30,
            display: "flex",
            flexDirection: "column",
            gap: 8,
        },
        chatListItemContainer: {
            width: "100%",
            padding: "8px 18px",
        },
        chatWindowWrapper: {
            flexGrow: 1,
            height: "100%",
        },
        headingText: {
            fontSize: 20,
        },
        newChatHeading: {
            fontSize: 18,
            marginTop: 25,
        },
        headerContainer: {
            marginTop: 30,
            padding: "0 25px",
            display: "flex",
            alignItems: "center",
        },
        selectedUsersContainer: {
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            width: "85%",
            margin: "15px 0",
        },
        createText: {
            position: "absolute",
            right: 15,
            top: 10,
        },

        inputStyle: {
            width: "100%",
            backgroundColor: "var(--darkGrey)",
            border: "1px solid var(--darkGrey2)",
            height: 38,
            fontSize: 15,
            borderRadius: 5,
        },

        newChatModal: {
            position: "absolute",
            top: "35%",
            left: "50%",
            transform: "translate(-50%, -35%)",
            width: "30%",
            minWidth: 200,
            height: 450,
            minHeight: 300,
            overflow: "auto",
            display: "flex",
            flexDirection: " column",
            alignItems: "center",
            outline: "none",
            bgcolor: "var(--darkGrey3)",
            border: "1px solid var(--darkGrey2)",
        },
    }
export default Chats
