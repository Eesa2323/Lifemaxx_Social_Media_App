import React, { useEffect, useState } from "react"
import Modal from "./Modal"
import useChats from "../hooks/chats/useChats"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { BASE_URL } from "../utils/config"
import { FaUsers, FaUser } from "react-icons/fa"
import ProfilePic from "./ProfilePic"

const Spinner = () => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 20 }}>
        <div
            style={{
                border: "4px solid #333",
                borderTop: "4px solid #fff",
                borderRadius: "50%",
                width: 32,
                height: 32,
                animation: "spin 1s linear infinite",
            }}
        />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
)

const ShareModal = ({ isOpen, onClose, shareData, shareType = "journey" }) => {
    const [search, setSearch] = useState("")
    const [isSharing, setIsSharing] = useState(false)
    const [error, setError] = useState("")
    const axiosPrivate = useAxiosPrivate()
    const { fetchChats } = useChats()
    const queryClient = useQueryClient()

    // Fetch all chats by default
    const {
        data: chats,
        isLoading: isChatsLoading,
        isError: isChatsError,
    } = useQuery({
        queryKey: ["chats"],
        queryFn: fetchChats,
        enabled: isOpen && !search,
        staleTime: Infinity,
    })

    // Fetch search results (chats + users)
    const {
        data: searchResults,
        isLoading: isSearchLoading,
        isError: isSearchError,
    } = useQuery({
        queryKey: ["share-search", search],
        queryFn: async () => {
            const res = await axiosPrivate.get(
                `${BASE_URL}/api/chats/search?q=${encodeURIComponent(search)}`
            )
            return res.data
        },
        enabled: isOpen && !!search,
    })

    // Mutation for sharing content
    const shareMutation = useMutation({
        mutationFn: async ({ chatId, userId }) => {
            let payload = {
                ...(chatId && { chatId }),
                ...(userId && { userId }),
            }

            let endpoint = ""
            if (shareType === "journey") {
                payload.journeyPostId = shareData._id
                endpoint = `${BASE_URL}/api/messages/share-journey`
            }
            if (shareType === "community") {
                payload.communityId = shareData._id
                endpoint = `${BASE_URL}/api/messages/share-community`
            } else if (shareType === "story") {
                payload.storyId = shareData._id
                endpoint = `${BASE_URL}/api/messages/share-story`
            } else if (shareType === "post") {
                payload.postId = shareData._id
                endpoint = `${BASE_URL}/api/messages/share-post`
            }

            const res = await axiosPrivate.post(endpoint, payload)
            return res.data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(["chats"])
            setError("")
            if (data.isNewChat) {
                // Navigate to new chat
                console.log("New chat created:", data.chat)
            }
            onClose()
        },
        onError: (error) => {
            setError(error?.response?.data || `Failed to share ${shareType}.`)
            setIsSharing(false)
        },
        onSettled: () => {
            setIsSharing(false)
        },
    })

    const handleShare = async (chatId = null, userId = null) => {
        if (!shareData?._id) {
            setError(`No ${shareType} to share`)
            return
        }
        setError("")
        setIsSharing(true)
        shareMutation.mutate({ chatId, userId })
    }

    const showChats = !search
    const showSearch = !!search

    useEffect(() => {
        console.log("Is open modal: " + isOpen)
    }, [isOpen])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            fullScreen={window.innerWidth <= 600}
            style={{
                overflow: "auto",
            }}
        >
            <div
                style={{
                    padding: 24,
                    width: "100%",
                    maxWidth: 500,
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: window.innerWidth <= 600 === false && 500,
                    minHeight: window.innerWidth <= 600 ? "100vh" : "auto",
                }}
            >
                <h4 style={{ color: "#fff", marginTop: 16, marginBottom: 16 }}>
                    Share{" "}
                    {shareType === "journey"
                        ? "Journey"
                        : shareType === "community"
                        ? "Community"
                        : "Story"}
                </h4>
                <input
                    type='text'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search chats or users...'
                    style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #333",
                        background: "#222",
                        color: "#fff",
                        marginBottom: 20,
                        marginTop: 20,
                        fontSize: 16,
                    }}
                />
                <div
                    style={{
                        color: "#aaa",
                        minHeight: "300px",
                    }}
                >
                    {showChats && (
                        <>
                            {isChatsLoading && <div>Loading chats...</div>}
                            {isChatsError && <div>Error loading chats.</div>}
                            {chats && chats.length === 0 && <div>No chats found.</div>}
                            {chats &&
                                chats.map((chat) => (
                                    <div
                                        key={chat._id}
                                        style={{
                                            padding: "16px 20px",
                                            borderBottom: "1px solid #333",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            cursor: isSharing ? "not-allowed" : "pointer",
                                            borderRadius: "8px",
                                            marginBottom: "4px",
                                            opacity: isSharing ? 0.6 : 1,
                                        }}
                                        onClick={() => !isSharing && handleShare(chat._id)}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                flex: 1,
                                            }}
                                        >
                                            <ProfilePic
                                                size={40}
                                                src={chat.chatPicture || null}
                                                style={{ marginRight: "12px", flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: "#fff",
                                                        fontSize: 15,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        maxWidth:
                                                            window.innerWidth <= 600
                                                                ? "calc(100vw - 140px)"
                                                                : "320px",
                                                    }}
                                                    title={
                                                        chat.chatTitle ||
                                                        chat.users
                                                            ?.map((u) => u.username)
                                                            .join(", ")
                                                    }
                                                >
                                                    {chat.chatTitle ||
                                                        chat.users
                                                            ?.map((u) => u.username)
                                                            .join(", ")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </>
                    )}
                    {showSearch && (
                        <>
                            {isSearchLoading && <div>Searching...</div>}
                            {isSearchError && <div>Error searching.</div>}
                            {searchResults &&
                                searchResults.chats.length === 0 &&
                                searchResults.users.length === 0 && <div>No results found.</div>}
                            {searchResults && (
                                <>
                                    {/* Show USERS FIRST */}
                                    {searchResults.users.map((user) => (
                                        <div
                                            key={user._id}
                                            style={{
                                                padding: "16px 20px",
                                                borderBottom: "1px solid #333",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                cursor: isSharing ? "not-allowed" : "pointer",
                                                borderRadius: "8px",
                                                marginBottom: "4px",
                                                opacity: isSharing ? 0.6 : 1,
                                            }}
                                            onClick={() =>
                                                !isSharing && handleShare(null, user._id)
                                            }
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    flex: 1,
                                                }}
                                            >
                                                <ProfilePic
                                                    size={40}
                                                    src={user.profilePic || null}
                                                    style={{ marginRight: "12px", flexShrink: 0 }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: "#fff",
                                                            fontSize: 15,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            maxWidth:
                                                                window.innerWidth <= 600
                                                                    ? "calc(100vw - 140px)"
                                                                    : "320px",
                                                        }}
                                                        title={user.username}
                                                    >
                                                        {user.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Show GROUP CHATS SECOND */}
                                    {searchResults.chats.map((chat) => (
                                        <div
                                            key={chat._id}
                                            style={{
                                                padding: "16px 20px",
                                                borderBottom: "1px solid #333",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                cursor: isSharing ? "not-allowed" : "pointer",
                                                borderRadius: "8px",
                                                marginBottom: "4px",
                                                opacity: isSharing ? 0.6 : 1,
                                            }}
                                            onClick={() => !isSharing && handleShare(chat._id)}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    flex: 1,
                                                }}
                                            >
                                                <ProfilePic
                                                    size={40}
                                                    src={chat.chatPicture || null}
                                                    style={{ marginRight: "12px", flexShrink: 0 }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: "#fff",
                                                            fontSize: 15,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            maxWidth:
                                                                window.innerWidth <= 600
                                                                    ? "calc(100vw - 140px)"
                                                                    : "320px",
                                                        }}
                                                        title={
                                                            chat.chatTitle ||
                                                            chat.users
                                                                ?.map((u) => u.username)
                                                                .join(", ")
                                                        }
                                                    >
                                                        {chat.chatTitle ||
                                                            chat.users
                                                                ?.map((u) => u.username)
                                                                .join(", ")}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
                {isSharing && <Spinner />}
                {error && (
                    <div
                        style={{
                            color: "#ff6b6b",
                            marginTop: 16,
                            textAlign: "center",
                            fontSize: 15,
                        }}
                    >
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    )
}

export default ShareModal
