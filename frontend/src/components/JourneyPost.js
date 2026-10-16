import React, { useState, useLayoutEffect, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai"
import { FaRegPaperPlane } from "react-icons/fa"
import { formatNotificationDate as format } from "../utils/format"
import PostComments from "./PostComments"
import Like from "./Like"
import { BASE_URL } from "../utils/config"
import ShareModal from "./ShareModal"
import { useSelector } from "react-redux"
import MiniPopup from "./MiniPopup"
import UnauthorizedLoginPopupModal from "./UnauthorizedLoginPopupModal"
import MentionText from "./MentionText"
import { useLocation } from "react-router-dom"
import { usePostFeedMute } from "../contexts/PostFeedMuteContext"
import ThreeDotsMenu from "./ThreeDotsMenu"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import ProfilePic from "./ProfilePic"

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg"]
function isVideoUrl(url) {
    if (!url) return false
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext))
}

// We don't need the buildSafeVideoUrl helper anymore
// Will use direct URL instead

const styles = {
    card: {
        background: "#0a0d14",
        borderRadius: "0px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
        padding: "0",
        width: "100%",
        maxWidth: 600,
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        margin: "0 auto",
        transition: "none",
    },
    cardMobile: {
        maxWidth: "100%",
        padding: "0",
        borderRadius: "0px",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
        background: "#0a0d14",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        minHeight: 56,
        justifyContent: "space-between",
        padding: "1rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        minWidth: 0,
        flex: 1,
    },
    profilePic: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        objectFit: "cover",
        background: "#1f2937",
        flexShrink: 0,
    },
    userInfo: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        minWidth: 0,
        gap: 2,
    },
    username: {
        color: "#f8fafc",
        fontWeight: 600,
        fontSize: 14,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: 260,
        padding: 0,
        margin: 0,
    },
    date: {
        color: "#94a3b8",
        fontSize: 12,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: 140,
        padding: 0,
        margin: 0,
    },
    image: {
        width: "100%",
        maxHeight: 600,
        objectFit: "cover",
        borderRadius: "0px",
        background: "#000",
        margin: "0",
    },
    captionContainer: {
        position: "relative",
        marginBottom: 0,
        paddingBottom: 0,
        width: "100%",
        textAlign: "left",
        padding: "1rem",
    },
    caption: {
        color: "#e2e8f0",
        fontSize: 14,
        margin: 0,
        whiteSpace: "pre-line",
        wordBreak: "break-word",
        overflow: "hidden",
        maxHeight: 300,
        transition: "max-height 0.2s ease",
        width: "100%",
    },
    captionExpanded: {
        maxHeight: "none",
        overflow: "visible",
    },
    showMore: {
        color: "#7c93ff",
        fontSize: 13,
        cursor: "pointer",
        marginTop: 6,
    },
    actions: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginTop: "0",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: 0,
        padding: "0.75rem 1rem",
        minHeight: 40,
        background: "transparent",
        zIndex: 1,
    },
    actionGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    actionCount: {
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: 500,
    },
    video: {
        position: "relative",
        width: "100%",
        height: "100%",
        maxHeight: 600,
        objectFit: "cover",
        background: "#000",
        margin: 0,
        display: "block",
    },
    videoOverlay: {
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "auto",
        zIndex: 2,
    },
    videoContainer: {
        position: "relative",
        width: "100%",
        maxHeight: 600,
        borderRadius: "0px",
        background: "#000",
        margin: "0",
        overflow: "hidden",
    },
    journeyBlock: {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "1rem",
        borderRadius: 18,
        marginBottom: 14,
    },
    journeyHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    journeyLeft: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        flex: 1,
    },
    journeyTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 4,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    journeyMeta: {
        color: "#aaa",
        fontSize: 12,
    },
    journeyRight: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    journeyBadge: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#1a1a1a",
        border: "1px solid #333",
        padding: "6px 8px",
        borderRadius: 12,
        minHeight: 28,
    },
    badgeIcon: {
        fontSize: 14,
    },
    badgeText: {
        color: "#fff",
        fontWeight: 600,
        fontSize: 13,
    },
    journeyDesc: {
        marginTop: 8,
        color: "#ddd",
        fontSize: 14,
        lineHeight: 1.4,
    },
    journeyUserRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    journeyUserInfo: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
    },
    journeyUserName: {
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: 250,
        cursor: "pointer",
    },
    journeyUserDate: {
        color: "#aaa",
        fontSize: 12,
    },
    goToJourneyContainer: {
        marginTop: 10,
        display: "flex",
        justifyContent: "flex-start",
    },
    goToJourneyLink: {
        color: "#0095f6",
        textDecoration: "none",
        fontWeight: 700,
        fontSize: 13,
        padding: "6px 10px",
        background: "transparent",
        borderRadius: 8,
        border: "1px solid transparent",
        transition: "all 0.15s",
    },
    showMore: {
        color: "#999",
        cursor: "pointer",
        marginTop: 6,
        fontSize: 13,
    },
}

const isMobile = () => window.innerWidth <= 600

const JourneyPost = ({
    post,
    cacheKey,
    isInView,
    shouldPlay,
    setCurrentlyPlayingId,
    containerRef,
    autoOpenComments = false,
    type = "journey",
    isFeed = false,
}) => {
    const user = post.user || post.creator || {}
    const [expanded, setExpanded] = useState(false)
    const [showShowMore, setShowShowMore] = useState(false)
    const captionRef = React.useRef(null)
    const videoRef = useRef(null)
    const internalRef = useRef(null)
    const rootRef = containerRef || internalRef
    const isVideo = isVideoUrl(post.url)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const { isMuted, setIsMuted } = usePostFeedMute()
    const [videoAspectRatio, setVideoAspectRatio] = useState(null)
    const [showControls, setShowControls] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [journeyExpanded, setJourneyExpanded] = useState(false)
    // Popup state
    const [popupType, setPopupType] = useState(null) // 'like' | 'comment' | null
    const likeBtnRef = useRef(null)
    const userData = useSelector((state) => state.auth.userData)
    const token = useSelector((state) => state.auth.token)
    const isCommunityPost = !!post.community
    const isMember = isCommunityPost ? !!post.isMember : true
    const isAuthenticated = !!token
    const canInteract = isAuthenticated && isMember
    const location = useLocation()
    const queryClient = useQueryClient()
    const axiosPrivate = useAxiosPrivate()

    // Extract journey info safely (support multiple possible shapes)
    const journey = post.journey || post.journeyInfo || post.journeyPost || {}
    const journeyTitle = journey.title || post.title || post.journeyTitle || ""
    const journeyDate =
        journey.date || journey.createdAt || post.journeyDate || post.date || post.createdAt
    const journeyDescription =
        journey.description || post.description || post.journeyDescription || ""
    const journeyId = journey._id || post.journeyId || post.journeyPost?._id || post._id || null
    // Consider a journey present if any of these properties exist on the post
    const hasJourney = Boolean(
        post.journey || post.journeyInfo || post.journeyPost || post.journeyId,
    )

    // Creator completed journeys count (support different casing)
    let completedJourneysCountRaw =
        (user && (user.completejourneys || user.completeJourneys || user.completedJourneys)) || 0
    let completedJourneysCount = 0
    if (Array.isArray(completedJourneysCountRaw))
        completedJourneysCount = completedJourneysCountRaw.length
    else if (typeof completedJourneysCountRaw === "number")
        completedJourneysCount = completedJourneysCountRaw
    else if (typeof completedJourneysCountRaw === "string")
        completedJourneysCount = Number(completedJourneysCountRaw) || 0
    else completedJourneysCount = 0

    // Read from React Router state
    const fromNotification = location.state?.fromNotification
    const openComments = location.state?.openComments
    const sortBy = fromNotification && openComments ? "mentions" : null
    const shouldAutoOpenComments = autoOpenComments || openComments

    const navigate = useNavigate()
    // Delete post mutation
    const deletePost = useMutation({
        mutationFn: async () => {
            const response = await axiosPrivate.delete(`${BASE_URL}/api/posts/${post._id}`)
            return response.data
        },
        onSuccess: () => {
            // Invalidate queries to refresh the posts list
            queryClient.invalidateQueries({ queryKey: ["journeyPosts"] })
            queryClient.invalidateQueries({ queryKey: ["posts"] })
            queryClient.invalidateQueries({ queryKey: ["discovers"] })
        },
        onError: (error) => {
            console.error("Error deleting post:", error)
        },
    })

    // Use useLayoutEffect for accurate DOM measurement
    useLayoutEffect(() => {
        function checkOverflow() {
            if (captionRef.current && !expanded) {
                setShowShowMore(
                    captionRef.current.scrollHeight > parseInt(styles.caption.maxHeight, 10),
                )
            }
        }
        checkOverflow()
        window.addEventListener("resize", checkOverflow)
        return () => window.removeEventListener("resize", checkOverflow)
    }, [post.caption, expanded])

    // Extra check after mount to ensure DOM is painted
    useEffect(() => {
        if (!expanded) {
            const timeout = setTimeout(() => {
                if (captionRef.current) {
                    setShowShowMore(
                        captionRef.current.scrollHeight > parseInt(styles.caption.maxHeight, 10),
                    )
                }
            }, 50)
            return () => clearTimeout(timeout)
        }
    }, [post.caption, expanded])

    // Play/pause logic (robust: auto-play most visible, allow manual resume)
    useEffect(() => {
        if (!isVideo || !videoRef.current) return
        const video = videoRef.current

        // Create a reference to track the current play/pause operation
        const videoPlaybackRef = { current: null }

        if (shouldPlay) {
            if (video.paused) {
                // Wait for any pending operations to finish
                setTimeout(() => {
                    if (videoRef.current && videoRef.current.paused) {
                        videoPlaybackRef.current = videoRef.current.play().catch((err) => {
                            // Ignore abort errors which are expected when quickly switching between play/pause
                            if (err.name !== "AbortError") {
                                console.log("Video play error:", err.message)
                            }
                        })
                    }
                }, 50)
            }
        } else {
            // Only pause if not already paused
            if (!video.paused) {
                video.pause()
            }
        }

        // Cleanup function to handle component unmounting
        return () => {
            // If there's a pending play operation and we're unmounting, handle it
            if (videoPlaybackRef.current && typeof videoPlaybackRef.current.then === "function") {
                videoPlaybackRef.current.catch(() => {})
            }
        }
    }, [shouldPlay, isVideo, post._id])

    // Handle muted state changes
    useEffect(() => {
        if (!isVideo || !videoRef.current) return
        videoRef.current.muted = isMuted
    }, [isMuted, isVideo])

    // Handler for login-required popup
    const handleRequireLogin = (refType) => {
        setPopupType(refType)
    }

    // Handler for closing popup
    const handleClosePopup = () => setPopupType(null)

    // Handler for popup button
    const handlePopupButton = () => {
        setPopupType(null)
        window.location.href = "/login"
    }

    // Handler for delete post
    const handleDeletePost = () => {
        if (
            window.confirm(
                "Are you sure you want to delete this post? This action cannot be undone.",
            )
        ) {
            deletePost.mutate()
        }
    }

    // Responsive style
    const cardStyle = isMobile() ? { ...styles.card, ...styles.cardMobile } : styles.card

    // ensure you have a ref and hasLoaded state already:
    // const videoRef = useRef(null)
    // const [hasLoaded, setHasLoaded] = useState(false)

    // When the component mounts or URL changes, if metadata is already present,
    // mark as loaded and attempt a tiny seek to paint the first frame.
    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        // If metadata/first-frame already available, mark as loaded and try a tiny seek
        if (v.readyState >= 1) {
            try {
                if (v.currentTime < 0.04) v.currentTime = 0.05
            } catch {}
            setHasLoaded(true)
        }
        return undefined
    }, [post.url])

    return (
        <div
            style={cardStyle}
            ref={rootRef}
            data-postid={post._id}
        >
            {/* If rendering in feed mode, show journey summary block */}
            {isFeed && hasJourney && (
                <div style={styles.journeyBlock}>
                    <div style={styles.journeyHeader}>
                        <div style={styles.journeyLeft}>
                            {/* show user info inside journey header when in feed */}
                            <div style={styles.journeyUserRow}>
                                <ProfilePic
                                    size={36}
                                    style={{ marginTop: 7 }}
                                    latestStory={user.latestStory}
                                    src={
                                        user.profilePic
                                            ? `${BASE_URL}/uploads/profilePics/${user.profilePic}`
                                            : null
                                    }
                                />
                                {/* <img
                                    src={user.profilePic ? `${BASE_URL}/uploads/profilePics/${user.profilePic}` : defaultProfilePic}
                                    alt={user.username}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        objectFit: "cover",
                                    }}
                                /> */}
                                <div style={styles.journeyUserInfo}>
                                    <div
                                        onClick={() =>
                                            user?.username && navigate(`/profile/${user.username}`)
                                        }
                                        style={styles.journeyUserName}
                                    >
                                        {user.username || "Unknown user"}
                                    </div>
                                    {journeyDate && (
                                        <div style={styles.journeyUserDate}>
                                            {format(journeyDate)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div style={styles.journeyRight}>
                            <div style={styles.journeyBadge}>
                                <span style={styles.badgeIcon}>🏁</span>
                                <span style={styles.badgeText}>{completedJourneysCount || 0}</span>
                            </div>
                        </div>
                    </div>
                    {journeyDescription && (
                        <div style={styles.journeyDesc}>
                            <div
                                style={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: journeyExpanded ? "none" : 3,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {journeyDescription}
                            </div>
                            {journeyDescription.length > 180 && (
                                <div
                                    style={styles.showMore}
                                    onClick={() => setJourneyExpanded((s) => !s)}
                                >
                                    {journeyExpanded ? "Show less" : "Show more"}
                                </div>
                            )}
                        </div>
                    )}
                    {journeyId && (
                        <div style={styles.goToJourneyContainer}>
                            <Link
                                to={`/journeys/${journeyId}`}
                                style={styles.goToJourneyLink}
                            >
                                Go to journey →
                            </Link>
                        </div>
                    )}
                </div>
            )}
            {!(isFeed && hasJourney) && (
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <ProfilePic
                            userData={post.creator}
                            latestStory={post?.latestStory}
                            src={`${BASE_URL}/uploads/profilePics/${user.profilePic}`}
                            size={40}
                        />
                        <div style={styles.userInfo}>
                            <span style={styles.username}>{user.username || "Unknown"}</span>
                            <span style={styles.date}>{format(post.createdAt)}</span>
                        </div>
                    </div>
                    <ThreeDotsMenu
                        onDelete={handleDeletePost}
                        isCreator={
                            userData?._id === post.creator?._id || userData?._id === user._id
                        }
                        position='right'
                    />
                </div>
            )}
            {post.url && isVideo ? (
                <div
                    style={{
                        ...styles.videoContainer,
                        // Use actual aspect ratio when available, otherwise default to 16:9
                        ...(videoAspectRatio
                            ? { aspectRatio: videoAspectRatio }
                            : { aspectRatio: "16/9" }),
                    }}
                    onMouseEnter={() => isPlaying && setShowControls(true)}
                    onMouseLeave={() => setShowControls(false)}
                    onTouchStart={() => isPlaying && setShowControls((prev) => !prev)}
                >
                    <video
                        ref={videoRef}
                        key={`${post._id}-${post.url}`}
                        src={`${BASE_URL}${post.url}`}
                        style={{
                            ...styles.video,
                            // backgroundColor removed to avoid black flash
                            backgroundColor: "#000",
                            opacity: hasLoaded ? 1 : 0,
                            transition: "opacity 120ms ease-out",
                        }}
                        controls={false}
                        preload='metadata'
                        playsInline
                        muted={isMuted}
                        crossOrigin='anonymous'
                        onLoadStart={() => {
                            const v = videoRef.current
                            if (!v) return
                            // If metadata is already available, don't flip to loading
                            if (v.readyState >= 1) return
                            setHasLoaded(false)
                        }}
                        onLoadedMetadata={() => {
                            const v = videoRef.current
                            if (!v) return
                            // record aspect ratio so container can size correctly before/while loading
                            try {
                                if (v.videoWidth && v.videoHeight) {
                                    setVideoAspectRatio(v.videoWidth / v.videoHeight)
                                }
                            } catch (e) {}
                            // Try a tiny seek to prompt first-frame decode/paint and mark loaded.
                            try {
                                if (v.currentTime < 0.04) v.currentTime = 0.05
                            } catch (e) {}
                            setHasLoaded(true)
                        }}
                        onLoadedData={() => {
                            const v = videoRef.current
                            if (!v) return
                            // ensure aspect ratio is captured if metadata didn't provide it earlier
                            try {
                                if (!videoAspectRatio && v.videoWidth && v.videoHeight) {
                                    setVideoAspectRatio(v.videoWidth / v.videoHeight)
                                }
                            } catch (e) {}
                            // First frame is available on all browsers here; mark loaded.
                            setHasLoaded(true)
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />
                    {/* Removed spinner/loader overlay to prevent flicker on re-navigation */}
                    {hasLoaded && (
                        <>
                            {/* Play/Pause button (top right) */}
                            <button
                                type='button'
                                style={{
                                    position: "absolute",
                                    top: 10,
                                    right: 10,
                                    width: 36,
                                    height: 36,
                                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "none",
                                    padding: 0,
                                    margin: 0,
                                    cursor: "pointer",
                                    zIndex: 3,
                                    transition: "opacity 0.2s",
                                }}
                                onClick={() => {
                                    if (videoRef.current) {
                                        if (videoRef.current.paused) {
                                            videoRef.current.play().catch((err) => {
                                                if (err.name !== "AbortError") {
                                                    console.log("Video play error:", err.message)
                                                }
                                            })
                                        } else {
                                            videoRef.current.pause()
                                        }
                                    }
                                }}
                                aria-label={isPlaying ? "Pause video" : "Play video"}
                            >
                                {isPlaying ? (
                                    <svg
                                        width='16'
                                        height='16'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <rect
                                            x='6'
                                            y='4'
                                            width='4'
                                            height='16'
                                            fill='white'
                                        />
                                        <rect
                                            x='14'
                                            y='4'
                                            width='4'
                                            height='16'
                                            fill='white'
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        width='16'
                                        height='16'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <polygon
                                            points='6,4 20,12 6,20'
                                            fill='white'
                                        />
                                    </svg>
                                )}
                            </button>

                            {/* Sound/Mute button (bottom right) */}
                            <button
                                type='button'
                                style={{
                                    position: "absolute",
                                    bottom: 10,
                                    right: 10,
                                    width: 36,
                                    height: 36,
                                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "none",
                                    padding: 0,
                                    margin: 0,
                                    cursor: "pointer",
                                    zIndex: 3,
                                    transition: "opacity 0.2s",
                                }}
                                onClick={() => {
                                    if (!videoRef.current) return
                                    const willBeMuted = !isMuted
                                    setIsMuted(willBeMuted)
                                    if (!willBeMuted) {
                                        try {
                                            videoRef.current.muted = false
                                            videoRef.current.play().catch(() => {})
                                        } catch (e) {}
                                    } else {
                                        try {
                                            videoRef.current.muted = true
                                        } catch (e) {}
                                    }
                                }}
                                aria-label={isMuted ? "Unmute video" : "Mute video"}
                            >
                                {isMuted ? (
                                    <svg
                                        width='16'
                                        height='16'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <path
                                            d='M3,9H7L12,4V20L7,15H3V9Z'
                                            fill='white'
                                        />
                                        <line
                                            x1='16'
                                            y1='8'
                                            x2='22'
                                            y2='14'
                                            stroke='white'
                                            strokeWidth='2'
                                        />
                                        <line
                                            x1='16'
                                            y1='14'
                                            x2='22'
                                            y2='8'
                                            stroke='white'
                                            strokeWidth='2'
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        width='16'
                                        height='16'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <path
                                            d='M3,9H7L12,4V20L7,15H3V9Z'
                                            fill='white'
                                        />
                                        <path
                                            d='M16,9C17.7,10.5 17.7,13.5 16,15'
                                            stroke='white'
                                            strokeWidth='2'
                                            strokeLinecap='round'
                                        />
                                        <path
                                            d='M19,7C22,10 22,14 19,17'
                                            stroke='white'
                                            strokeWidth='2'
                                            strokeLinecap='round'
                                        />
                                    </svg>
                                )}
                            </button>
                        </>
                    )}
                </div>
            ) : post.url ? (
                <img
                    src={`${BASE_URL}${post.url}`}
                    alt='Post visual'
                    style={styles.image}
                />
            ) : null}
            <div style={styles.captionContainer}>
                <p
                    ref={captionRef}
                    style={{
                        ...styles.caption,
                        ...(expanded ? styles.captionExpanded : {}),
                    }}
                >
                    <MentionText text={post.caption} />
                </p>
                {!expanded && showShowMore && (
                    <span
                        style={styles.showMore}
                        onClick={() => setExpanded(true)}
                    >
                        Show more
                    </span>
                )}
            </div>
            <div style={styles.actions}>
                <div style={styles.actionGroup}>
                    <Like
                        post={post}
                        cacheKey={cacheKey}
                        isMember={isMember}
                        buttonRef={likeBtnRef}
                        onRequireLogin={() => handleRequireLogin("like")}
                    />
                </div>
                <div style={styles.actionGroup}>
                    <PostComments
                        post={post}
                        isMember={isMember}
                        checkCommunity={isCommunityPost}
                        sortBy={sortBy}
                        autoOpenComments={shouldAutoOpenComments}
                    />
                    <FaRegPaperPlane
                        style={{ fontSize: 22, cursor: "pointer", marginLeft: 12, color: "#aaa" }}
                        title='Share'
                        onClick={() => setShowShareModal(true)}
                    />
                </div>
            </div>
            {/* Popup for login required */}
            {popupType === "like" && (
                <MiniPopup
                    message={
                        isAuthenticated
                            ? "Join the community to like posts."
                            : "Please login to like posts."
                    }
                    buttonText={isAuthenticated ? "Close" : "Login"}
                    onButtonClick={handlePopupButton}
                    onClose={handleClosePopup}
                    anchorRef={likeBtnRef}
                />
            )}

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                shareData={post}
                shareType={type}
            />
        </div>
    )
}

export default JourneyPost
