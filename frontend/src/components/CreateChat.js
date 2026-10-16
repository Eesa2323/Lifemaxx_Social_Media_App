import React, { useState, useContext } from "react"
import { XIcon, CheckIcon } from "lucide-react"
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
import UserSearchWithSelect from "./UserSearchWithSelect"

// export default function CreateChat() {
//     const [searchQuery, setSearchQuery] = useState("")
//     const [selected, setSelected] = useState([])
//     const [loading, setLoading] = useState(false)
//     const [isOpen, setIsOpen] = useState(false)
//     const isMobile = useMediaQuery({ maxWidth: 768 })
//     const styles = getStyles(isMobile)
//     const axiosPrivate = useAxiosPrivate()
//     const navigate = useNavigate()
//     const { createChatMutation } = useChats()
//     const userId = useSelector((state) => state.auth.userData?._id)
//     const queryClient = useQueryClient()
//     const { updateSelectedChatData } = useContext(ChatContext)

//     const { data: users, isLoading } = useQuery({
//         queryKey: ["searchUsers", searchQuery],
//         retry: 2,
//         queryFn: async () => {
//             const response = await axiosPrivate.get(`${BASE_URL}/api/users/search/${searchQuery}`)
//             return response.data
//         },
//         enabled: !!searchQuery,
//     })

//     const handleSearchChange = (e) => {
//         const q = e.target.value
//         setSearchQuery(q)
//     }

//     const toggleSelect = (user) => {
//         setSelected((prev) => {
//             const existingUser = prev.find((u) => u._id === user._id)
//             if (existingUser) return prev.filter((u) => u._id !== user._id)
//             return [...prev, user]
//         })
//     }

//     const handleCreate = async () => {
//         if (!selected.length) return
//         const isGroupChat = selected.length > 1
//         let chatData = {}
//         if (isGroupChat) {
//             try {
//                 const chatParticipantIds = [...selected.map((u) => u._id), userId]
//                 if (!chatParticipantIds?.length) return

//                 const newChat = await createChatMutation.mutateAsync(chatParticipantIds)
//                 chatData = { chatId: newChat._id }
//             } catch (err) {
//                 console.log(err)
//             }
//         } else {
//             const targetUser = selected[0]
//             const sortedChatParticipants = [targetUser._id, userId].sort()
//             const privateChatKey = `${sortedChatParticipants[0]}-${sortedChatParticipants[1]}`
//             const existingChat = queryClient
//                 .getQueryData(["chats"])
//                 ?.find((c) => c.privateChatKey === privateChatKey)
//             if (existingChat) chatData = { chatId: existingChat._id, privateChatKey }
//             else chatData = { privateChatKey, newChatData: { selectedUsers: selected } }
//         }
//         updateSelectedChatData(chatData)
//         setIsOpen(false)
//     }

//     const handleClose = () => {
//         setIsOpen(false)
//     }

//     return (
//         <>
//             <RiChatNewLine
//                 onClick={() => setIsOpen(true)}
//                 size={30}
//             />

//             <Modal
//                 isOpen={isOpen}
//                 onClose={handleClose}
//                 style={styles.modal}
//             >
//                 <div style={styles.header}>
//                     <h3 style={styles.title}>New Message</h3>
//                     <button
//                         onClick={handleClose}
//                         style={styles.closeButton}
//                     >
//                         <XIcon size={20} />
//                     </button>
//                 </div>

//                 <div style={styles.selectedContainer}>
//                     {selected.map((u) => {
//                         return (
//                             <span
//                                 key={u._id}
//                                 style={styles.chip}
//                             >
//                                 {u.username}
//                                 <XIcon
//                                     size={12}
//                                     style={styles.chipClose}
//                                     onClick={() => toggleSelect(u)}
//                                 />
//                             </span>
//                         )
//                     })}
//                     <input
//                         type='text'
//                         placeholder='Search...'
//                         value={searchQuery}
//                         onChange={handleSearchChange}
//                         style={styles.searchInline}
//                     />
//                 </div>

//                 <div style={styles.listContainer}>
//                     {loading ? (
//                         <p>Searching...</p>
//                     ) : (
//                         users?.map((u) => (
//                             <div
//                                 key={u._id}
//                                 style={styles.listItem}
//                                 onClick={() => toggleSelect(u)}
//                             >
//                                 <ProfilePic
//                                     src={u.profilePic}
//                                     size={32}
//                                 />
//                                 <span style={styles.username}>{u.username}</span>
//                                 <div style={styles.iconWrapper}>
//                                     {selected.find((s) => s._id === u._id) ? (
//                                         <CheckIcon size={16} />
//                                     ) : (
//                                         <div style={styles.emptyCircle} />
//                                     )}
//                                 </div>
//                             </div>
//                         ))
//                     )}
//                 </div>

//                 <button
//                     style={{
//                         ...styles.createButton,
//                         opacity: selected.length ? 1 : 0.5,
//                         pointerEvents: selected.length ? "auto" : "none",
//                     }}
//                     onClick={handleCreate}
//                     disabled={loading}
//                 >
//                     {loading ? "Creating..." : "Chat"}
//                 </button>
//             </Modal>
//         </>
//     )
// }

export default function CreateChat() {
    const queryClient = useQueryClient()
    const { createChatMutation } = useChats()
    const [open, setOpen] = useState(false)
    const { updateSelectedChatData } = useContext(ChatContext)
    const userId = useSelector((state) => state.auth.userData?._id)

    const updateOpen = (value) => setOpen(value)

    const handleCreate = async (selected) => {
        if (!selected.length) return

        const isGroupChat = selected.length > 1
        let chatData = {}
        if (isGroupChat) {
            try {
                const chatParticipantIds = [...selected.map((u) => u._id), userId]
                if (!chatParticipantIds?.length) return

                const newChat = await createChatMutation.mutateAsync(chatParticipantIds)
                chatData = { chatId: newChat._id }
            } catch (err) {
                console.log(err)
            }
        } else {
            const targetUser = selected[0]
            const sortedChatParticipants = [targetUser._id, userId].sort()
            const privateChatKey = `${sortedChatParticipants[0]}-${sortedChatParticipants[1]}`
            const existingChat = queryClient
                .getQueryData(["chats"])
                ?.find((c) => c.privateChatKey === privateChatKey)
            if (existingChat) chatData = { chatId: existingChat._id, privateChatKey }
            else chatData = { privateChatKey, newChatData: { selectedUsers: selected } }
        }
        console.log(chatData)
        updateSelectedChatData(chatData)
    }

    return (
        <UserSearchWithSelect
            isOpen={open}
            updateOpen={updateOpen}
            onCreate={handleCreate}
            typeData={{ type: "NEW_CHAT" }}
        />
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
        listContainer: { flex: 1, overflowY: "auto", marginBottom: 12 },
        listItem: { display: "flex", gap: 8, padding: "8px 4px", cursor: "pointer" },
        avatar: { width: 32, height: 32, borderRadius: "50%", marginRight: 8 },
        username: { flex: 1, color: "#fff", fontSize: 14, marginTop: 6 },
        check: { color: "#4caf50" },
        iconWrapper: {
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        emptyCircle: { width: 16, height: 16, borderRadius: "50%", border: "2px solid #555" },

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
