import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import ProfilePic from "./ProfilePic"
import { BASE_URL } from "../utils/config"
import Modal from "./Modal"
import useAxiosPrivate from "../hooks/useAxiosPrivate"

const UserList = ({ users, handleClick, isLoading = false, isOwn = false, type, profileId }) => {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const queryClient = useQueryClient()
    const axiosPrivate = useAxiosPrivate()

    const removeFollowerMutation = useMutation({
        mutationFn: (followerId) => axios.delete(`/api/users/remove-follower/${followerId}`),
        onSuccess: () => {
            queryClient.invalidateQueries([profileId, type])
            setShowConfirmDialog(false)
            setSelectedUser(null)
        },
    })

    const unfollowMutation = useMutation({
        mutationFn: async (targetUserId) => {
            const res = await axiosPrivate.put(`${BASE_URL}/api/users/follow/${targetUserId}`, {
                type: "unfollow",
            })
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries([profileId, type])
            setShowConfirmDialog(false)
            setSelectedUser(null)
        },
    })

    const handleRemoveClick = (e, user) => {
        e.stopPropagation()
        setSelectedUser(user)
        setShowConfirmDialog(true)
    }

    const handleConfirmRemove = () => {
        if (type === "followers") {
            removeFollowerMutation.mutate(selectedUser._id)
        } else {
            unfollowMutation.mutate(selectedUser._id)
        }
    }
    const [hoveredUser, setHoveredUser] = useState(null)
    if (isLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>Loading...</div>
            </div>
        )
    }

    if (!users || users.length === 0) {
        return (
            <div style={styles.emptyContainer}>
                <div style={styles.emptyText}>No users found</div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            {users.map((user) => (
                <div
                    key={user._id}
                    style={{
                        ...styles.userItem,
                        backgroundColor:
                            hoveredUser === user._id ? "rgba(255, 255, 255, 0.05)" : "transparent",
                    }}
                    onClick={() => handleClick(user)}
                    onMouseEnter={() => setHoveredUser(user._id)}
                    onMouseLeave={() => setHoveredUser(null)}
                >
                    <ProfilePic
                        src={
                            user.profilePic
                                ? `${BASE_URL}/uploads/profilePics/${user.profilePic}`
                                : null
                        }
                        size={40}
                    />
                    <div style={styles.userInfo}>
                        <div style={styles.username}>{user.username}</div>
                        {/* {user.bio && (
                            <div style={styles.bio}>
                                {user.bio.length > 50 ? `${user.bio.slice(0, 50)}...` : user.bio}
                            </div>
                        )} */}
                    </div>
                    {isOwn && (
                        <button
                            onClick={(e) => handleRemoveClick(e, user)}
                            style={styles.removeButton}
                        >
                            Remove
                        </button>
                    )}
                </div>
            ))}
            {showConfirmDialog && (
                <Modal
                    isOpen={showConfirmDialog}
                    onClose={() => {
                        setShowConfirmDialog(false)
                        setSelectedUser(null)
                    }}
                    style={styles.confirmModal}
                >
                    <div style={styles.confirmContent}>
                        <h4 style={styles.confirmTitle}>
                            Are you sure you want to remove this{" "}
                            {type === "followers" ? "follower" : "following"}?
                        </h4>
                        <div style={styles.confirmButtons}>
                            <button
                                onClick={handleConfirmRemove}
                                style={styles.confirmButton}
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmDialog(false)
                                    setSelectedUser(null)
                                }}
                                style={styles.cancelButton}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
    },
    removeButton: {
        backgroundColor: "#333",
        color: "#fff",
        border: "none",
        padding: "6px 12px",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "12px",
        marginLeft: "10px",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "#444",
        },
    },
    confirmModal: {
        content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#1a1a1a",
            padding: "20px",
            maxWidth: "400px",
            width: "90%",
            borderRadius: "10px",
        },
    },
    confirmContent: {
        textAlign: "center",
        color: "#fff",
    },
    confirmTitle: {
        margin: "0 0 20px",
        fontSize: "18px",
    },
    confirmButtons: {
        display: "flex",
        justifyContent: "center",
        gap: "10px",
    },
    confirmButton: {
        backgroundColor: "#ff4444",
        color: "#fff",
        border: "none",
        padding: "8px 20px",
        borderRadius: "5px",
        cursor: "pointer",
    },
    cancelButton: {
        backgroundColor: "#333",
        color: "#fff",
        border: "none",
        padding: "8px 20px",
        borderRadius: "5px",
        cursor: "pointer",
    },
    userItem: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 12,
        padding: 12,
        borderRadius: 8,
        cursor: "pointer",
        transition: "background-color 0.2s",
        minHeight: 56,
    },
    userInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 2,
    },
    username: {
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.2,
    },
    bio: {
        color: "#aaa",
        fontSize: 12,
        lineHeight: 1.3,
    },
    loadingContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    loadingText: {
        color: "#aaa",
        fontSize: 14,
    },
    emptyContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyText: {
        color: "#aaa",
        fontSize: 14,
    },
}

// export default UserList

// import React, { useState } from "react"

// import ProfilePic from "./ProfilePic"
// import { BASE_URL } from "../utils/config"

// const UserList = ({ users, handleClick, isLoading = false }) => {
//     const [hoveredUser, setHoveredUser] = useState(null)
//     if (isLoading) {
//         return (
//             <div style={styles.loadingContainer}>
//                 <div style={styles.loadingText}>Loading...</div>
//             </div>
//         )
//     }

//     if (!users || users.length === 0) {
//         return (
//             <div style={styles.emptyContainer}>
//                 <div style={styles.emptyText}>No users found</div>
//             </div>
//         )
//     }

//     return (
//         <div style={styles.container}>
//             {users.map((user) => (
//                 <div
//                     key={user._id}
//                     style={{
//                         ...styles.userItem,
//                         backgroundColor:
//                             hoveredUser === user._id ? "rgba(255, 255, 255, 0.05)" : "transparent",
//                     }}
//                     onClick={() => handleClick(user)}
//                     onMouseEnter={() => setHoveredUser(user._id)}
//                     onMouseLeave={() => setHoveredUser(null)}
//                 >
//                     <ProfilePic
//                         src={
//                             user.profilePic
//                                 ? `${BASE_URL}/uploads/profilePics/${user.profilePic}`
//                                 : null
//                         }
//                         size={40}
//                     />
//                     <div style={styles.userInfo}>
//                         <div style={styles.username}>{user.username}</div>
//                         {user.bio && (
//                             <div style={styles.bio}>
//                                 {user.bio.length > 50 ? `${user.bio.slice(0, 50)}...` : user.bio}
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             ))}
//         </div>
//     )
// }

// const styles = {
//     container: {
//         display: "flex",
//         flexDirection: "column",
//         gap: 12,
//     },
//     userItem: {
//         display: "flex",
//         alignItems: "center",
//         gap: 12,
//         padding: 12,
//         borderRadius: 8,
//         cursor: "pointer",
//         transition: "background-color 0.2s",
//     },
//     userInfo: {
//         flex: 1,
//         display: "flex",
//         flexDirection: "column",
//         gap: 2,
//     },
//     username: {
//         color: "#fff",
//         fontSize: 14,
//         fontWeight: 500,
//     },
//     bio: {
//         color: "#aaa",
//         fontSize: 12,
//         lineHeight: 1.3,
//     },
//     loadingContainer: {
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         padding: 40,
//     },
//     loadingText: {
//         color: "#aaa",
//         fontSize: 14,
//     },
//     emptyContainer: {
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         padding: 40,
//     },
//     emptyText: {
//         color: "#aaa",
//         fontSize: 14,
//     },
// }

export default UserList
