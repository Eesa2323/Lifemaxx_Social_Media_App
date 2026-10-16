import React, { useState, useContext, useEffect } from "react"
import { XIcon, CheckIcon, AlertCircle } from "lucide-react"
import axios from "axios"
import Modal from "./Modal"
import { useMediaQuery } from "react-responsive"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import ProfilePic from "./ProfilePic"
import { useNavigate } from "react-router-dom"
import { RiChatNewLine } from "react-icons/ri"
import useChats from "../hooks/chats/useChats"
import { useSelector } from "react-redux"
import ChatContext from "../contexts/ChatContext"
import { Skeleton } from "./Skeleton"

export default function UserSearchWithSelect({ isOpen, updateOpen, typeData = {}, onCreate }) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selected, setSelected] = useState([])
    const [showSkeletons, setShowSkeletons] = useState(false)
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const styles = getStyles(isMobile)
    const axiosPrivate = useAxiosPrivate()

    const title = typeData?.type === "NEW_CHAT_PARTICIPANTS" ? "Add Participants" : "Chat"

    const { data: users, isLoading } = useQuery({
        queryKey:
            typeData?.type === "NEW_CHAT_PARTICIPANTS"
                ? ["searchNewChatParticipants", searchQuery]
                : ["searchUsers", searchQuery],
        retry: 2,
        queryFn: async () => {
            let appendix

            if (typeData?.type === "NEW_CHAT_PARTICIPANTS") {
                appendix = `/api/chats/search/new/${searchQuery}/${typeData.chatId}`
            } else appendix = `/api/users/search/${searchQuery}`

            const response = await axiosPrivate.get(`${BASE_URL}${appendix}`)
            return response.data
        },
        enabled: !!searchQuery,
    })

    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => setShowSkeletons(true), 170)
            return () => clearTimeout(timer)
        } else {
            setShowSkeletons(false)
        }
    }, [isLoading])

    const handleSearchChange = (e) => {
        const q = e.target.value
        setSearchQuery(q)
    }

    const toggleSelect = (user) => {
        setSelected((prev) => {
            const existingUser = prev.find((u) => u._id === user._id)
            if (existingUser) return prev.filter((u) => u._id !== user._id)
            return [...prev, user]
        })
    }

    const handleCreate = async () => {
        if (!selected.length) return

        await onCreate(selected)
        updateOpen(false)
    }

    const handleClose = () => {
        updateOpen(false)
    }

    return (
        <>
            {typeData?.type === "NEW_CHAT" && (
                <RiChatNewLine
                    onClick={() => updateOpen(true)}
                    size={30}
                />
            )}

            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                style={styles.modal}
            >
                <div style={styles.header}>
                    <h3 style={styles.title}>
                        {typeData?.type === "NEW_CHAT_PARTICIPANTS"
                            ? "Add Participants"
                            : "New Message"}
                    </h3>
                    {/* <button
                        onClick={handleClose}
                        style={styles.closeButton}
                    >
                        <XIcon size={20} />
                    </button> */}
                </div>

                <div style={styles.selectedContainer}>
                    {selected.map((u) => {
                        return (
                            <span
                                key={u._id}
                                style={styles.chip}
                            >
                                {u.username}
                                <XIcon
                                    size={12}
                                    style={styles.chipClose}
                                    onClick={() => toggleSelect(u)}
                                />
                            </span>
                        )
                    })}
                    <input
                        type='text'
                        placeholder='Search...'
                        value={searchQuery}
                        onChange={handleSearchChange}
                        style={styles.searchInline}
                    />
                </div>

                <div style={styles.listContainer}>
                    {showSkeletons ? (
                        <>
                            {[1, 2, 3, 4, 5].map((index) => (
                                <div
                                    key={`skeleton-${index}`}
                                    style={styles.listItem}
                                >
                                    <Skeleton
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Skeleton
                                        style={{
                                            flex: 1,
                                            height: 20,
                                            borderRadius: 4,
                                            marginLeft: 0,
                                        }}
                                    />
                                </div>
                            ))}
                        </>
                    ) : searchQuery && users && users.length === 0 ? (
                        <div style={styles.noResultsContainer}>
                            <AlertCircle
                                size={48}
                                style={styles.noResultsIcon}
                            />
                            <p style={styles.noResultsText}>No results found</p>
                        </div>
                    ) : (
                        users?.map((u) => (
                            <div
                                key={u._id}
                                style={styles.listItem}
                                onClick={() => toggleSelect(u)}
                            >
                                <ProfilePic
                                    src={u.profilePic}
                                    size={32}
                                />
                                <span style={styles.username}>{u.username}</span>
                                <div style={styles.iconWrapper}>
                                    {selected.find((s) => s._id === u._id) ? (
                                        <CheckIcon size={16} />
                                    ) : (
                                        <div style={styles.emptyCircle} />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button
                    style={{
                        ...styles.createButton,
                        opacity: selected.length ? 1 : 0.5,
                        pointerEvents: selected.length ? "auto" : "none",
                    }}
                    onClick={handleCreate}
                >
                    {title}
                </button>
            </Modal>
        </>
    )
}

const getStyles = (isMobile) => {
    return {
        overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
        },
        modal: {
            backgroundColor: "#1e1e1e",
            borderRadius: 12,
            width: isMobile ? "100%" : "40%",
            minWidth: isMobile ? "100%" : 500,
            maxHeight: isMobile ? "100%" : "80vh",
            minHeight: isMobile ? "100%" : 500,
            display: "flex",
            flexDirection: "column",
            padding: 25,
        },
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
        },
        title: { color: "#fff", margin: 0, fontSize: 18 },
        closeButton: { background: "none", border: "none", color: "#fff", cursor: "pointer" },
        selectedContainer: {
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            marginBottom: 12,
            backgroundColor: "#2a2a2a",
            padding: 8,
            borderRadius: 8,
        },
        chip: {
            display: "flex",
            alignItems: "center",
            backgroundColor: "#3a3a3a",
            borderRadius: 16,
            padding: "4px 8px",
            color: "#fff",
        },
        chipClose: { marginLeft: 4, cursor: "pointer" },
        searchInline: {
            flex: 1,
            background: "none",
            border: "none",
            color: "#ccc",
            outline: "none",
            padding: 4,
            minWidth: 60,
        },
        listContainer: {
            flex: 1,
            overflowY: "auto",
            marginBottom: 12,
            paddingRight: 4,
        },
        listItem: {
            display: "flex",
            gap: 8,
            padding: "8px 4px",
            cursor: "pointer",
            alignItems: "center",
        },
        avatar: { width: 32, height: 32, borderRadius: "50%", marginRight: 8 },
        username: { flex: 1, color: "#fff", fontSize: 14, marginBottom: 8 },
        check: { color: "#4caf50" },
        iconWrapper: {
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        emptyCircle: { width: 16, height: 16, borderRadius: "50%", border: "2px solid #555" },
        noResultsContainer: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            gap: 12,
        },
        noResultsIcon: {
            color: "#666",
        },
        noResultsText: {
            color: "#999",
            fontSize: 14,
            margin: 0,
        },

        createButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 0",
            cursor: "pointer",
            fontSize: 16,
        },
    }
}
