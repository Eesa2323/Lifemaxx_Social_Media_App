import UserSearch from "./UserSearch"
import { useNavigate } from "react-router-dom"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import useUsers from "../hooks/useUsers"
import { produce } from "immer"
import { useEffect, useState } from "react"
import { useMediaQuery } from "react-responsive"
import { BASE_URL, SMALL_SCREEN_SIZE } from "../utils/config"
import { BiBell, BiX, BiArrowBack, BiTrash } from "react-icons/bi"
import { useDispatch, useSelector } from "react-redux"
import useNotifications from "../hooks/useNotifications"
import { updateUserData } from "../store/authSlice"
import { Fragment } from "react"
import { formatNotificationDate } from "../utils/format"
import NotificationBadge from "./NotificationBadge"
import useAxiosPrivate from "../hooks/useAxiosPrivate"

const queryKey = ["notifications", "unread_count"]

// Helper function to truncate text
function truncateText(text, maxLength = 50) {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
}

function receiveNotificationMessage(n, authUserId) {
    let obj = {}

    if (n.type === "follow") {
        if (authUserId !== n.from._id)
            obj = { username: n.from.username, message: ` started following you.` }
        else obj = { username: n.to.username, message: ` accepted your request.` }
    }
    if (n.type === "comment" && n.references.length) {
        const commentReference = n.references.find((r) => r.modelRef === "Comment")
        const postReference = n.references.find((r) => r.modelRef === "Post")

        if (commentReference && postReference) {
            const postType = postReference.data.community ? "community post" : "journey post"
            const truncatedContent = truncateText(commentReference.data.content, 40)
            obj = {
                username: n.from.username,
                message: ` commented: ${truncatedContent} on your ${postType}`,
                imgUrl: `${BASE_URL}/uploads/posts/${postReference.data.fileName}`,
                imgRedirectPath: `/posts/${postReference.data._id}`,
                postType: postType,
                communityId: postReference.data.community,
                journeyId: postReference.data.journey,
            }
        }
    }
    if (n.type === "mention" && n.references.length) {
        const commentReference = n.references.find((r) => r.modelRef === "Comment")
        const postReference = n.references.find((r) => r.modelRef === "Post")

        if (commentReference && postReference) {
            // Mention in a comment
            const postType = postReference.data.community ? "community post" : "journey post"
            const truncatedContent = truncateText(commentReference.data.content, 40)
            obj = {
                username: n.from.username,
                message: ` mentioned you in a comment: ${truncatedContent}`,
                imgUrl: `${BASE_URL}/uploads/posts/${postReference.data.fileName}`,
                imgRedirectPath: `/posts/${postReference.data._id}`,
                isCommentMention: true, // Flag to indicate this is a comment mention
                postType: postType,
                communityId: postReference.data.community,
                journeyId: postReference.data.journey,
            }
        } else {
            // Handle mention in post caption
            const postReference = n.references.find((r) => r.modelRef === "Post")
            if (postReference) {
                const postType = postReference.data.community ? "community post" : "journey post"
                const truncatedCaption = truncateText(postReference.data.caption, 40)
                obj = {
                    username: n.from.username,
                    message: ` mentioned you in a ${postType}: ${truncatedCaption}`,
                    imgUrl: `${BASE_URL}/uploads/posts/${postReference.data.fileName}`,
                    imgRedirectPath: `/posts/${postReference.data._id}`,
                    isCommentMention: false, // Flag to indicate this is a post caption mention
                    postType: postType,
                    communityId: postReference.data.community,
                    journeyId: postReference.data.journey,
                }
            }
        }
    }
    return obj
}

const NotificationSidebar = ({ open, onClose, isMobile, left, sidebarWidth }) => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const queryClient = useQueryClient()
    const lastReadTime = useSelector((state) => state.auth.userData?.lastReadNotificationTime)
    const [activeTab, setActiveTab] = useState(0)
    const { fetchRequests, fetchNotifications, updateNotificationTimestamp } = useNotifications()

    const { isLoading: isLoadingRequests, data: requests } = useInfiniteQuery({
        queryKey: ["follow_requests"],
        queryFn: fetchRequests,
        initialPageParam: undefined,
        enabled: open,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    })
    const { isLoading: isLoadingNotifications, data: notifications } = useInfiniteQuery({
        queryKey: ["notifications"],
        queryFn: fetchNotifications,
        initialPageParam: undefined,
        enabled: open,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    })

    // Debug logging
    console.log("Notifications data:", notifications)
    console.log("Notifications pages:", notifications?.pages)
    if (notifications?.pages?.length > 0) {
        console.log("First page notifications:", notifications.pages[0]?.notifications)
        console.log(
            "Notification types:",
            notifications.pages[0]?.notifications?.map((n) => n.type)
        )
    }

    const { mutate } = useMutation({
        mutationFn: updateNotificationTimestamp,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey })
            dispatch(
                updateUserData({
                    property: "lastReadNotificationTime",
                    value: new Date().toISOString(),
                })
            )
            queryClient.setQueryData(queryKey, (prevData) => {
                return { ...prevData, count: 0 }
            })
        },
    })

    const updateActiveTab = (value) => setActiveTab(value)

    const data = activeTab === 0 ? notifications : requests
    const isLoading = isLoadingNotifications || isLoadingRequests
    const hasRequests = requests?.pages.some((p) => p.requests.length > 0)

    useEffect(() => {
        if (!open) return
        const timestamp = lastReadTime || new Date(0).toISOString()
        const latestNotificationDate = notifications?.pages?.at(0)?.notifications?.[0]?.createdAt
        const latestRequestDate = requests?.pages?.at(0)?.requests?.[0]?.createdAt
        if (
            (latestRequestDate && latestRequestDate > timestamp) ||
            (latestNotificationDate && latestNotificationDate > timestamp)
        )
            mutate()
    }, [queryClient, mutate, notifications, requests, open])

    if (!open) return null

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: left ? (isMobile ? 0 : sidebarWidth || 220) : undefined,
                right: left ? undefined : 0,
                width: isMobile ? "100vw" : 450,
                height: "100vh",
                background: "var(--surface)",
                borderRight: left ? "1px solid #333" : undefined,
                borderLeft: !left ? "1px solid #333" : undefined,
                zIndex: 2000,
                boxShadow: left ? "2px 0 8px rgba(0,0,0,0.12)" : "-2px 0 8px rgba(0,0,0,0.12)",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.3s",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 20,
                    borderBottom: "1px solid #222",
                }}
            >
                <h3 style={{ color: "#ff4444", margin: 0 }}>Notifications</h3>
                <button
                    onClick={onClose}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#fff",
                        fontSize: 24,
                        cursor: "pointer",
                    }}
                    aria-label='Close notifications'
                >
                    <BiX size={28} />
                </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "var(--surface)" }}>
                {data?.pages?.map((page, pageIndex) => {
                    const list = activeTab === 0 ? page?.notifications : page?.requests
                    return (
                        <Fragment key={pageIndex}>
                            {list.map((n) => {
                                if (activeTab === 1) {
                                    return (
                                        <RequestItem
                                            key={n._id}
                                            pageIndex={pageIndex}
                                            r={n}
                                        />
                                    )
                                } else {
                                    return (
                                        <NotificationItem
                                            key={n._id}
                                            pageIndex={pageIndex}
                                            n={n}
                                        />
                                    )
                                }
                            })}
                        </Fragment>
                    )
                })}
            </div>
        </div>
    )
}

const NotificationItem = ({ n, pageIndex }) => {
    const userId = useSelector((state) => state.auth.userData._id)
    const {
        username,
        message,
        imgUrl,
        imgRedirectPath,
        isCommentMention,
        postType,
        communityId,
        journeyId,
    } = receiveNotificationMessage(n, userId)
    const navigate = useNavigate()
    const formattedDate = formatNotificationDate(n.createdAt)
    const queryClient = useQueryClient()
    const [showError, setShowError] = useState(false)
    const axiosPrivate = useAxiosPrivate()
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await axiosPrivate.delete(`${BASE_URL}/api/notifications/${n._id}`)
            return res.data
        },
        onMutate: async () => {
            const previous = queryClient.getQueryData(["notifications"])
            queryClient.setQueryData(["notifications"], (old) => {
                if (!old) return old
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        notifications: page.notifications.filter((notif) => notif._id !== n._id),
                    })),
                }
            })
            return { previous }
        },
    })

    // Handle case where notification message couldn't be processed
    if (!username || !message) {
        console.warn("Could not process notification:", n)
        return (
            <div style={styles.itemContainer}>
                <div style={{ display: "flex", width: "100%" }}>
                    <div style={{ flex: 5, flexWrap: "nowrap" }}>
                        <span className='roboto-light'>Unknown notification type: {n.type}</span>
                    </div>
                </div>
            </div>
        )
    }

    const handleNotificationClick = () => {
        if (n.type === "mention" && imgRedirectPath) {
            navigate(imgRedirectPath, {
                state: {
                    fromNotification: true,
                    openComments: isCommentMention,
                },
            })
        } else if (n.type === "comment" && imgRedirectPath) {
            navigate(imgRedirectPath, {
                state: {
                    fromNotification: true,
                    openComments: true,
                },
            })
        }
    }

    return (
        <div style={styles.itemContainer}>
            <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
                <div
                    style={{
                        flex: 5,
                        minWidth: 0,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <span
                        style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "normal",
                            maxWidth: 220,
                            lineHeight: 1.3,
                            minHeight: 0,
                        }}
                    >
                        <span className='roboto-medium'>{username}</span>
                        <span
                            className='roboto-light'
                            style={{ marginLeft: 4 }}
                        >
                            {message}
                        </span>
                    </span>
                </div>
                {imgUrl && (
                    <div
                        onClick={handleNotificationClick}
                        style={{ paddingLeft: 20, cursor: "pointer" }}
                    >
                        <img
                            style={{ marginLeft: "auto" }}
                            width={"30px"}
                            height={"30px"}
                            src={imgUrl}
                        />
                    </div>
                )}
                <div
                    style={{
                        color: "#999",
                        fontSize: "13px",
                        marginLeft: "auto",
                        marginRight: 8,
                        flexShrink: 0,
                    }}
                >
                    {formattedDate}
                </div>
                <button
                    onClick={() => deleteMutation.mutate()}
                    style={{
                        background: "none",
                        border: "none",
                        marginLeft: 4,
                        cursor: "pointer",
                        color: "#ff4444",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        padding: 0,
                    }}
                    aria-label='Delete notification'
                    title='Delete notification'
                >
                    <BiTrash size={22} />
                </button>
            </div>
            {((deleteMutation.isError && showError) || showError) && (
                <div style={{ color: "#ff4444", fontSize: 13, marginTop: 6, marginLeft: 2 }}>
                    {deleteMutation.error?.message ||
                        "Failed to delete notification. Please try again."}
                </div>
            )}
        </div>
    )
}

const RequestItem = ({ r, pageIndex }) => {
    const { handleFollowRequest } = useNotifications()
    const message = `${r.requester.username} sent you a follow request.`
}

const styles = {
    itemContainer: {
        width: "100%",
        wordWrap: "break-word",
        fontSize: 15,
        alignItems: "center",
        display: "flex",
        marginBottom: 16,
    },
    requestButtons: {
        display: "flex",
        gap: 5,
        paddingLeft: 10,
        marginLeft: "auto",
        flexWrap: "nowrap",
    },
    requestButtonStyle: {
        backgroundColor: "var(--primary)",
        width: 70,
        height: 32,
        fontWeight: 500,
        borderRadius: 10,
        fontSize: 14,
        border: "1px solid transparent",
    },
    confirmBtnStyles: {
        backgroundColor: "var(--primary)",
    },
    deleteBtnStyles: {
        backgroundColor: "var(--darkGrey2)",
    },
}

export default NotificationSidebar
