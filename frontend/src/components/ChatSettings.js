import React, { useState, useContext, useEffect } from "react"
import { XIcon, CheckIcon, UserPlus } from "lucide-react"
import Modal from "./Modal"
import { useMediaQuery } from "react-responsive"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import ProfilePic from "./ProfilePic"
import { useSelector } from "react-redux"
import { useMutation } from "@tanstack/react-query"
import UserSearchWithSelect from "./UserSearchWithSelect"
import { produce } from "immer"
import ChatContext from "../contexts/ChatContext"
import Button from "./Button"
import { IoIosInformationCircleOutline as SettingsIcon } from "react-icons/io"
import usePendingMutations from "../hooks/usePendingMutations"

const ChatSettings = ({ chatData }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [addMode, setAddMode] = useState(false)
    const [chatTitle, setChatTitle] = useState(chatData?.chatTitle || "")
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const styles = getStyles(isMobile)
    const axiosPrivate = useAxiosPrivate()
    const isGroupChat = !chatData?.privateChatKey
    const queryClient = useQueryClient()
    const { addMessageToCache, deleteChatInCache, removeUserFromChat, updateSelectedChatData } =
        useContext(ChatContext)

    const updateAddMode = (value) => {
        setAddMode(value)
        // When opening add participants modal, hide the main modal
        // When closing add participants modal, show the main modal again
        if (value) {
            setIsOpen(false)
        } else {
            setIsOpen(true)
        }
    }

    // Check for pending mutations
    const { isPendingMutations: isPendingProfilePic } = usePendingMutations([
        "editChatProfilePic",
        chatData?._id,
    ])
    const { isPendingMutations: isPendingChatTitle } = usePendingMutations([
        "editChatTitle",
        chatData?._id,
    ])

    const addUsersMutation = useMutation({
        mutationFn: async ({ userIds }) => {
            const res = await axiosPrivate.post(
                `${BASE_URL}/api/chats/add_participants/${chatData._id}`,
                { chatParticipantIds: userIds },
            )
            return res.data
        },
        onSuccess: (data, vars) => {
            const { message } = data
            const { selected } = vars

            addMessageToCache(chatData._id, message)

            queryClient.setQueryData(["chats"], (prevChats) => {
                return produce(prevChats, (draft) => {
                    const targetId = chatData._id

                    const idx = draft.findIndex((c) => String(c._id) === targetId)
                    console.log("Updating chat index:", idx, "for id", targetId)

                    if (idx === -1) {
                        return
                    }

                    const chat = draft[idx]

                    selected.forEach((user) => {
                        // normalize here too, just in case
                        const userId = user.id
                        console.log(JSON.stringify(user), "User to add:", userId)

                        if (!chat.users.some((u) => String(u.id) === userId)) {
                            chat.users.push(user)
                        }
                    })
                })
            })

            setAddMode(false)
            setIsOpen(true) // Show the main modal again after successful addition
        },
        onError: (err) => console.log(err),
    })

    const editChatProfilePicMutation = useMutation({
        mutationKey: ["editChatProfilePic", chatData?._id],
        mutationFn: async ({ file }) => {
            const formData = new FormData()
            formData.append("file", file)

            const res = await axiosPrivate.put(
                `${BASE_URL}/api/chats/edit/${chatData._id}`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                },
            )
            return res.data
        },
        onSuccess: (data) => {
            const { message, updatedDetails } = data
            addMessageToCache(chatData._id, message)

            queryClient.setQueryData(["chats"], (oldData) => {
                return produce(oldData, (draft) => {
                    const chat = draft?.find((c) => c._id === chatData._id)
                    if (chat) {
                        chat.chatPicture = updatedDetails.chatPicture
                    }
                })
            })
        },
        onError: (err) => console.log(err),
    })

    const editChatTitleMutation = useMutation({
        mutationKey: ["editChatTitle", chatData?._id],
        mutationFn: async ({ title }) => {
            const res = await axiosPrivate.put(`${BASE_URL}/api/chats/edit/${chatData._id}`, {
                chatTitle: title,
            })
            return res.data
        },
        onSuccess: (data) => {
            const { message, updatedDetails } = data
            addMessageToCache(chatData._id, message)

            queryClient.setQueryData(["chats"], (oldData) => {
                return produce(oldData, (draft) => {
                    const chat = draft?.find((c) => c._id === chatData._id)
                    if (chat) {
                        chat.chatTitle = updatedDetails.chatTitle
                    }
                })
            })
        },
        onError: (err) => console.log(err),
    })

    const leaveChatMutation = useMutation({
        mutationFn: async ({ chatId }) => {
            const response = await axiosPrivate.put(`${BASE_URL}/api/chats/leave_chat/${chatId}`)
            return response.data
        },
        onSuccess: (data) => {
            const { chatId, userId } = data
            removeUserFromChat(chatId, userId, true)

            updateSelectedChatData(null)
            setIsOpen(false)
        },
        onError: (err) => console.log(err),
    })

    const deleteChatMutation = useMutation({
        mutationFn: async ({ chatId }) => {
            const response = await axiosPrivate.put(`${BASE_URL}/api/chats/delete_chat/${chatId}`)
            return response.data
        },
        onSuccess: (data) => {
            const { chatId } = data
            deleteChatInCache(chatId)

            updateSelectedChatData(null)
            setIsOpen(false)
        },
        onError: (err) => console.log(err),
    })

    const handleAddParticipants = async (selected) => {
        if (!selected.length) return

        const userIds = selected.map((u) => u._id)
        await addUsersMutation.mutate({ userIds, selected })
    }

    const handleProfilePicChange = (file) => {
        if (file && !isPendingProfilePic) {
            editChatProfilePicMutation.mutate({ file })
        }
    }

    const handleChatTitleChange = () => {
        if (chatTitle.trim() && chatTitle !== chatData?.chatTitle && !isPendingChatTitle) {
            editChatTitleMutation.mutate({ title: chatTitle.trim() })
        }
    }

    const isTitleChanged = chatTitle.trim() !== (chatData?.chatTitle || "")
    const isTitleChangeDisabled = !isTitleChanged || isPendingChatTitle || !chatTitle.trim()

    // Update chatTitle when chatData changes
    useEffect(() => {
        setChatTitle(chatData?.chatTitle || "")
    }, [chatData?.chatTitle])

    useEffect(() => {
        console.log(addMode)
    }, [addMode])

    return (
        chatData?._id && (
            <>
                <button
                    onClick={() => setIsOpen(true)}
                    style={styles.settingsButton}
                >
                    <SettingsIcon
                        size={26}
                        style={{ marginTop: 6 }}
                    />
                </button>

                <Modal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    fullscreen={isMobile}
                    style={styles.modal}
                >
                    <div style={styles.header}>
                        <h3 style={styles.title}>Chat Settings</h3>
                        {/* <button
                            onClick={() => setIsOpen(false)}
                            style={styles.closeButton}
                        >
                            <XIcon size={20} />
                        </button> */}
                    </div>

                    {/* Group Chat Editing Section */}
                    {isGroupChat && (
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <h4>Group Details</h4>
                            </div>

                            {/* Group Profile Picture */}
                            <div style={styles.groupEditContainer}>
                                <ProfilePic
                                    src={
                                        chatData?.chatPicture
                                            ? `${BASE_URL}/uploads/profilePics/${chatData.chatPicture}`
                                            : null
                                    }
                                    size={60}
                                    hasEdit={true}
                                    editText={isPendingProfilePic ? "Uploading..." : "Upload"}
                                    onChange={handleProfilePicChange}
                                />
                            </div>

                            {/* Group Title */}
                            <div style={styles.titleEditContainer}>
                                <input
                                    type='text'
                                    value={chatTitle}
                                    onChange={(e) => setChatTitle(e.target.value)}
                                    placeholder='Group name'
                                    style={styles.titleInput}
                                    maxLength={50}
                                />
                                <Button
                                    onClick={handleChatTitleChange}
                                    disabled={isTitleChangeDisabled}
                                    style={{
                                        ...styles.changeBtn,
                                        opacity: isTitleChangeDisabled ? 0.5 : 1,
                                        cursor: isTitleChangeDisabled ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {isPendingChatTitle ? "Changing..." : "Change"}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h6>Members</h6>

                            <div
                                style={{
                                    display: "flex",
                                    width: "100%",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    gap: 10,
                                }}
                            >
                                <>
                                    {isGroupChat && (
                                        <Button
                                            onClick={() => {
                                                leaveChatMutation.mutate({
                                                    chatId: chatData._id,
                                                })
                                            }}
                                            style={styles.btn}
                                        >
                                            Leave
                                        </Button>
                                    )}

                                    <Button
                                        onClick={() => {
                                            deleteChatMutation.mutate({ chatId: chatData._id })
                                        }}
                                        style={styles.btn}
                                    >
                                        Delete
                                    </Button>

                                    {isGroupChat && (
                                        <UserPlus
                                            size={20}
                                            onClick={() => setAddMode(true)}
                                            style={styles.addButton}
                                        />
                                    )}
                                </>
                            </div>
                        </div>

                        <div style={styles.userList}>
                            {chatData?.users?.map((user) => (
                                <div
                                    key={user._id}
                                    style={styles.userItem}
                                >
                                    <ProfilePic
                                        src={user.profilePic}
                                        size={32}
                                    />
                                    <span style={styles.username}>{user.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>

                <UserSearchWithSelect
                    updateOpen={updateAddMode}
                    isOpen={addMode}
                    onCreate={handleAddParticipants}
                    typeData={{ type: "NEW_CHAT_PARTICIPANTS", chatId: chatData._id }}
                />
            </>
        )
    )
}

const getStyles = (isMobile) => ({
    settingsButton: {
        background: "none",
        border: "none",
        color: "#fff",
        fontSize: 24,
        cursor: "pointer",
        marginLeft: "auto",
        marginBottom: 10,
        padding: "0 20px",
    },
    modal: {
        backgroundColor: "#1a1a1a",
        borderRadius: isMobile ? 0 : 12,
        width: isMobile ? "100%" : "40%",
        minWidth: isMobile ? "100%" : 500,
        height: isMobile ? "100%" : "80vh",
        padding: 20,
        overflow: "auto",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        borderBottom: "1px solid #333",
        paddingBottom: 15,
    },
    title: {
        color: "#fff",
        margin: 0,
        fontSize: 20,
    },
    closeButton: {
        background: "none",
        border: "none",
        color: "#666",
        cursor: "pointer",
    },
    section: {
        marginTop: 20,
    },
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        marginBottom: 15,
    },
    addButton: {
        cursor: "pointer",
        color: "#3b82f6",
        "&:hover": {
            opacity: 0.8,
        },
    },
    userList: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 12,
        paddingBottom: 15,
    },
    userItem: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#2a2a2a",
    },
    username: {
        color: "#fff",
        fontSize: 14,
    },
    searchContainer: {
        marginBottom: 20,
    },
    searchInput: {
        width: "100%",
        padding: 12,
        borderRadius: 8,
        background: "#2a2a2a",
        border: "none",
        color: "#fff",
        fontSize: 14,
    },
    listContainer: {
        flex: 1,
        overflowY: "auto",
        marginBottom: 20,
    },
    listItem: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        cursor: "pointer",
        "&:hover": {
            backgroundColor: "#2a2a2a",
        },
    },
    checkWrapper: {
        marginLeft: "auto",
        paddingRight: 10,
    },
    emptyCircle: {
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid #555",
    },
    btn: {
        width: 90,
        fontSize: 11,
        padding: 0,
        margin: 0,
        height: 30,
        backgroundColor: "#222",
    },
    groupEditContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 20,
        padding: 15,
        backgroundColor: "#2a2a2a",
        borderRadius: 8,
    },
    titleEditContainer: {
        display: "flex",
        gap: 10,
        alignItems: "center",
        marginBottom: 20,
    },
    titleInput: {
        flex: 1,
        padding: 10,
        borderRadius: 6,
        background: "#2a2a2a",
        border: "1px solid #444",
        color: "#fff",
        fontSize: 14,
        outline: "none",
    },
    changeBtn: {
        width: 80,
        fontSize: 12,
        padding: "8px 12px",
        height: "auto",
        backgroundColor: "#046bc5",
        border: "none",
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
    },
})

export default ChatSettings
