import React, { useState, useEffect, useRef, useContext } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useMediaQuery } from "react-responsive"
import { useSelector } from "react-redux"
import useStories from "../hooks/useStories"
import { BASE_URL } from "../utils/config"
import Spinner from "../components/Spinner"
import PostsContext from "../contexts/PostContext"
import ShareModal from "../components/ShareModal"

// Custom VideoPlayer component to handle video files with authentication
const VideoPlayer = ({ src, style, token }) => {
    const [videoSrc, setVideoSrc] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        const setupVideoSrc = () => {
            try {
                setLoading(true)
                setError(false)

                console.log("VideoPlayer - Setting up video src:", src)
                console.log("VideoPlayer - Token available:", !!token)
                console.log(
                    "VideoPlayer - Token value:",
                    token ? token.substring(0, 20) + "..." : "No token",
                )

                // The src is already in the correct format: /api/stories/media/filename
                // Just add the token as query parameter for authentication
                let streamingUrl = src
                if (token) {
                    streamingUrl += `?token=${encodeURIComponent(token)}`
                }

                console.log("VideoPlayer - Final streaming URL:", streamingUrl)

                // For video streaming with authentication, we'll use the new endpoint
                // The browser will automatically handle range requests for video streaming
                setVideoSrc(streamingUrl)
                setLoading(false)
            } catch (err) {
                console.error("Error setting up video:", err)
                setError(true)
                setLoading(false)
            }
        }

        if (src) {
            setupVideoSrc()
        }
    }, [src, token])

    if (loading) {
        return (
            <div
                style={{
                    ...style,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#000",
                }}
            >
                <div style={{ color: "white" }}>Loading video...</div>
            </div>
        )
    }

    if (error || !videoSrc) {
        return (
            <div
                style={{
                    ...style,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#000",
                    padding: "20px",
                }}
            >
                <div style={{ color: "white", textAlign: "center", marginBottom: "10px" }}>
                    Error loading video
                </div>
                <div style={{ color: "#ccc", fontSize: "12px", textAlign: "center" }}>
                    {!token ? "Authentication required" : "Check network connection"}
                </div>
            </div>
        )
    }

    return (
        <video
            src={videoSrc}
            style={style}
            autoPlay
            muted
            loop
            playsInline
            preload='metadata'
            onError={(e) => {
                console.error("Video playback error:", e)
                setError(true)
            }}
        />
    )
}

const UserStoriesPage = () => {
    const { userId } = useParams()
    const navigate = useNavigate()
    const {
        useUserStoriesQuery,
        markStoryAsViewedMutation,
        useStoryViewsQuery,
        deleteStoryMutation,
    } = useStories()
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const currentUserId = useSelector((state) => state.auth?.userData?._id)
    const token = useSelector((state) => state.auth?.token)

    const styles = {
        container: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
        },
        storyContainer: {
            position: "relative",
            width: isMobile ? "100vw" : "min(100vh * 9/16, 450px)",
            height: isMobile ? "100vh" : "100vh",
            aspectRatio: "9/16",
            backgroundColor: "#000",
            overflow: "hidden",
            cursor: "pointer",
        },
        progressContainer: {
            position: "absolute",
            top: "10px",
            left: "10px",
            right: "10px",
            zIndex: 20,
            display: "flex",
            gap: "4px",
        },
        progressBar: {
            flex: 1,
            height: "3px",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: "2px",
            overflow: "hidden",
        },
        progressFill: {
            height: "100%",
            backgroundColor: "#fff",
            borderRadius: "2px",
            transition: "width 0.1s linear",
        },
        header: {
            position: "absolute",
            top: "20px",
            left: "10px",
            right: "10px",
            zIndex: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "20px",
        },
        userInfo: {
            display: "flex",
            alignItems: "center",
            gap: "10px",
        },
        avatar: {
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "#666",
        },
        username: {
            color: "#fff",
            fontSize: "14px",
            fontWeight: "600",
        },
        timestamp: {
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "12px",
        },
        closeButton: {
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            fontSize: "18px",
        },
        mediaContainer: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        media: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
        },
        textOverlay: {
            position: "absolute",
            color: "#fff",
            fontSize: "24px",
            fontWeight: "bold",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            zIndex: 10,
            textAlign: "center",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "system-ui, -apple-system, sans-serif",
            transform: "translate(-50%, -50%)",
        },
        drawingOverlay: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 5,
            opacity: 1,
        },
        loadingContainer: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        loadingSpinner: {
            width: "40px",
            height: "40px",
            border: "3px solid rgba(255, 255, 255, 0.3)",
            borderTop: "3px solid #fff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
        },
        errorContainer: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
        },
        errorText: {
            color: "#fff",
            fontSize: "18px",
        },
        backButton: {
            backgroundColor: "#0095f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "16px",
            cursor: "pointer",
        },
        navigationArrow: {
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "18px",
            cursor: "pointer",
            zIndex: 30,
            transition: "all 0.3s ease",
            opacity: 0.8,
        },
        leftArrow: {
            left: "10px",
        },
        rightArrow: {
            right: "10px",
        },
        pausePlayButton: {
            position: "absolute",
            top: "20px",
            right: isMobile ? "60px" : "60px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "14px",
            cursor: "pointer",
            zIndex: 31,
            transition: "all 0.3s ease",
            opacity: 0.9,
            pointerEvents: "auto",
            userSelect: "none",
            marginTop: "20px",
        },
        actionButton: {
            position: "absolute",
            top: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "14px",
            cursor: "pointer",
            zIndex: 31,
            transition: "all 0.3s ease",
            opacity: 0.9,
            pointerEvents: "auto",
            userSelect: "none",
            marginTop: "20px",
        },
        viewsButton: {
            right: isMobile ? "100px" : "100px",
        },
        deleteButton: {
            right: isMobile ? "140px" : "140px",
        },
        shareButton: {
            right: isMobile ? "180px" : "180px",
        },
        modal: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
        },
        modalContent: {
            backgroundColor: "black",
            borderRadius: "12px",
            padding: "20px",
            color: "white",
            border: "1px solid var(--darkGrey)",
            maxWidth: "400px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto",
        },
        modalHeader: {
            fontSize: "18px",
            fontWeight: "bold",
            marginBottom: "15px",
            textAlign: "center",
        },
        viewItem: {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 0",
            borderBottom: "1px solid #eee",
        },
        viewAvatar: {
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "#ddd",
        },
        viewUsername: {
            fontSize: "14px",
            fontWeight: "500",
        },
        viewTime: {
            fontSize: "12px",
            color: "#666",
            marginLeft: "auto",
        },
        modalButtons: {
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginTop: "20px",
        },
        modalButton: {
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
        },
        cancelButton: {
            backgroundColor: "#f0f0f0",
            color: "#333",
        },
        confirmButton: {
            backgroundColor: "#ff4757",
            color: "#fff",
        },
        closeModalButton: {
            backgroundColor: "#0095f6",
            color: "#fff",
        },
    }

    const { state } = useLocation()
    const { storyFeedIndex, latestStoryDate } = state || {}

    const { updateStoryViewedTimestamps, getStoryViewedTimestamp } = useContext(PostsContext)

    const [currentStoryIndex, setCurrentStoryIndex] = useState(null)
    const [progress, setProgress] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [showViewsModal, setShowViewsModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [gifRefreshKey, setGifRefreshKey] = useState(0)

    const progressIntervalRef = useRef(null)
    const storyDuration = 5000 // 5 seconds per story

    // Fetch user stories
    const { data: stories = [], isLoading, isFetching, error } = useUserStoriesQuery(userId)

    const currentTimestamp =
        getStoryViewedTimestamp(userId) || stories?.findLast((s) => s.viewed === true)?.createdAt

    // Check if current user owns the stories
    const isOwnStories = currentUserId === userId

    // Get current story
    const currentStory = stories[currentStoryIndex]

    // Fetch views for current story if it's owned by current user
    const { data: storyViews = [], isLoading: viewsLoading } = useStoryViewsQuery(
        currentStory?._id,
        isOwnStories && showViewsModal,
    )

    useEffect(() => {
        if (isFetching || !stories) return

        const s = stories.findIndex((s) => s.viewed === false)
        const index = s !== -1 ? s : 0

        setCurrentStoryIndex(index)
    }, [isFetching])

    // Handle story progression
    useEffect(() => {
        if (!stories || stories.length === 0 || isPaused) return

        progressIntervalRef.current = setInterval(() => {
            setProgress((prev) => {
                const newProgress = prev + 100 / (storyDuration / 100)

                if (newProgress >= 100) {
                    // Story completed, move to next
                    if (currentStoryIndex < stories.length - 1) {
                        setCurrentStoryIndex(currentStoryIndex + 1)
                        return 0
                    } else {
                        // All stories completed, close
                        navigate(-1)
                        return 100
                    }
                }

                return newProgress
            })
        }, 100)

        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
            }
        }
    }, [currentStoryIndex, stories, isPaused, navigate])

    // Mark current story as viewed
    // useEffect(() => {
    //     if (stories && stories.length > 0 && currentStoryIndex < stories.length) {
    //         const currentStory = stories[currentStoryIndex]
    //         if (currentStory && !currentStory.isViewed) {
    //             markStoryAsViewedMutation.mutate(currentStory._id)
    //         }
    //     }
    // }, [currentStoryIndex, stories, markStoryAsViewedMutation])

    useEffect(() => {
        const story = stories?.[currentStoryIndex]
        if (!story || isFetching) return

        if (!currentTimestamp || currentTimestamp < story.createdAt || story.viewed === false) {
            markStoryAsViewedMutation.mutate({ _id: story._id, userId })
        }
        let updatedTimestamp
        const isLastStory = currentStoryIndex === stories.length - 1
        if (isLastStory && latestStoryDate > story.createdAt) {
            updatedTimestamp = latestStoryDate
        } else if (!currentTimestamp || currentTimestamp < story.createdAt) {
            updatedTimestamp = story.createdAt
        }

        updatedTimestamp && updateStoryViewedTimestamps(userId, updatedTimestamp)
    }, [
        currentStoryIndex,
        stories,
        latestStoryDate,
        userId,
        currentTimestamp,
        updateStoryViewedTimestamps,
        isFetching,
    ])

    useEffect(() => {
        console.log("Current story index changed:" + currentStoryIndex)
        console.log("Token available:", !!token)
        console.log("Token value:", token ? token.substring(0, 20) + "..." : "No token")
        if (currentStory) {
            console.log("Current story data:", currentStory)
            console.log("Media URL:", currentStory.mediaUrl)
            console.log("Media Type:", currentStory.mediaType)
            console.log("Old static URL:", `${BASE_URL}${currentStory.mediaUrl}`)
            console.log(
                "New streaming URL:",
                `${BASE_URL}/api/stories/media/${currentStory.mediaUrl.split("/").pop()}`,
            )
            if (token) {
                console.log(
                    "Full streaming URL with token:",
                    `${BASE_URL}/api/stories/media/${currentStory.mediaUrl
                        .split("/")
                        .pop()}?token=${encodeURIComponent(token)}`,
                )
            }
        }
    }, [currentStoryIndex, currentStory, token])

    // Handle GIF animation restart when story changes
    useEffect(() => {
        if (
            currentStory &&
            currentStory.mediaUrl &&
            currentStory.mediaUrl.toLowerCase().includes(".gif")
        ) {
            // Increment refresh key to force GIF re-render
            setGifRefreshKey((prev) => prev + 1)
        }
    }, [currentStoryIndex, currentStory])

    // // Handle keyboard navigation
    // useEffect(() => {
    //     const handleKeyPress = (e) => {
    //         if (e.key === "ArrowRight") {
    //             nextStory()
    //         } else if (e.key === "ArrowLeft") {
    //             previousStory()
    //         } else if (e.key === " ") {
    //             e.preventDefault() // Prevent page scroll
    //             togglePause()
    //         } else if (e.key === "Escape") {
    //             navigate(-1)
    //         }
    //     }

    //     window.addEventListener("keydown", handleKeyPress)
    //     return () => window.removeEventListener("keydown", handleKeyPress)
    // }, [currentStoryIndex, stories, isPaused])

    const nextStory = () => {
        if (!stories) return

        if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(currentStoryIndex + 1)
            setProgress(0)
        } else {
            navigate(-1)
        }
    }

    const previousStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(currentStoryIndex - 1)
            setProgress(0)
        }
    }

    const togglePause = () => {
        const newPausedState = !isPaused
        setIsPaused(newPausedState)

        // If unpausing and current story is a GIF, refresh it
        if (
            !newPausedState &&
            currentStory &&
            currentStory.mediaUrl &&
            currentStory.mediaUrl.toLowerCase().includes(".gif")
        ) {
            setGifRefreshKey((prev) => prev + 1)
        }
    }

    const handleViewsClick = (e) => {
        e.stopPropagation()
        setShowViewsModal(true)
        setIsPaused(true)
    }

    const handleDeleteClick = (e) => {
        e.stopPropagation()
        setShowDeleteModal(true)
        setIsPaused(true)
    }

    const handleShareClick = (e) => {
        e.stopPropagation()
        setShowShareModal(true)
        setIsPaused(true)
    }

    const handleDeleteConfirm = async () => {
        try {
            await deleteStoryMutation.mutateAsync(currentStory._id)
            setShowDeleteModal(false)
            // If this was the last story or only story, go back
            if (stories.length === 1 || currentStoryIndex === stories.length - 1) {
                navigate(-1)
            } else {
                // Move to next story or previous if at end
                if (currentStoryIndex < stories.length - 1) {
                    setCurrentStoryIndex(currentStoryIndex)
                } else {
                    setCurrentStoryIndex(currentStoryIndex - 1)
                }
                setProgress(0)
                setIsPaused(false)
            }
        } catch (error) {
            console.error("Failed to delete story:", error)
            setShowDeleteModal(false)
            setIsPaused(false)
        }
    }

    const handleModalClose = () => {
        setShowViewsModal(false)
        setShowDeleteModal(false)
        setShowShareModal(false)
        setIsPaused(false)

        // If current story is a GIF, refresh it when modal closes
        if (
            currentStory &&
            currentStory.mediaUrl &&
            currentStory.mediaUrl.toLowerCase().includes(".gif")
        ) {
            setGifRefreshKey((prev) => prev + 1)
        }
    }

    const handleStoryClick = (e) => {
        // Don't handle story click if clicking on a button
        if (e.target.tagName === "BUTTON") return

        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const containerWidth = rect.width

        if (clickX < containerWidth / 2) {
            previousStory()
        } else {
            nextStory()
        }
    }

    const handleMouseDown = (e) => {
        // Don't pause if clicking on a button
        if (e.target.tagName === "BUTTON") return
        setIsPaused(true)
    }

    const handleMouseUp = (e) => {
        // Don't unpause if clicking on a button
        if (e.target.tagName === "BUTTON") return
        setIsPaused(false)
    }

    if (isLoading || currentStoryIndex === null) {
        return (
            <div className='page-wrapper user-stories-page'>
                <div style={styles.storyContainer}>
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            zIndex: 50,
                        }}
                    >
                        <Spinner
                            size={32}
                            withStyles={false}
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (error || !stories || stories.length === 0) {
        return (
            <div
                className='page-wrapper user-stories-page'
                style={styles.errorContainer}
            >
                <span style={styles.errorText}>
                    {error ? "Failed to load stories" : "No stories available"}
                </span>
                <span style={{ ...styles.errorText, fontSize: "14px", opacity: 0.7 }}>
                    {error ? "Please try again later" : "This user hasn't posted any stories yet"}
                </span>
                <button
                    style={styles.backButton}
                    onClick={() => navigate(-1)}
                >
                    Go Back
                </button>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            <div
                style={styles.storyContainer}
                onClick={handleStoryClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
            >
                {/* Progress bars */}
                <div style={styles.progressContainer}>
                    {stories.map((_, index) => (
                        <div
                            key={index}
                            style={styles.progressBar}
                        >
                            <div
                                style={{
                                    ...styles.progressFill,
                                    width:
                                        index < currentStoryIndex
                                            ? "100%"
                                            : index === currentStoryIndex
                                              ? `${progress}%`
                                              : "0%",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.userInfo}>
                        <div style={styles.avatar}>
                            {currentStory.user?.profilePicture ? (
                                <img
                                    src={currentStory.user.profilePicture}
                                    alt={currentStory.user.username}
                                    style={styles.avatar}
                                />
                            ) : (
                                <div style={styles.avatar} />
                            )}
                        </div>
                        <div>
                            <div style={styles.username}>
                                {currentStory.user?.username || "Unknown User"}
                            </div>
                            <div style={styles.timestamp}>
                                {new Date(currentStory.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                            style={styles.closeButton}
                            onClick={(e) => {
                                e.stopPropagation()
                                navigate(-1)
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Media content */}
                {currentStory.mediaUrl && (
                    <div style={styles.mediaContainer}>
                        {currentStory.mediaType === "image" ? (
                            <img
                                key={
                                    currentStory.mediaUrl.toLowerCase().includes(".gif")
                                        ? `gif-${currentStory._id}-${gifRefreshKey}`
                                        : `img-${currentStory._id}`
                                }
                                src={`${BASE_URL}/api/stories/media/${currentStory.mediaUrl
                                    .split("/")
                                    .pop()}${token ? `?token=${encodeURIComponent(token)}` : ""}${
                                    currentStory.mediaUrl.toLowerCase().includes(".gif")
                                        ? `${token ? "&" : "?"}refresh=${gifRefreshKey}`
                                        : ""
                                }`}
                                alt='Story content'
                                style={styles.media}
                            />
                        ) : (
                            <VideoPlayer
                                src={`${BASE_URL}/api/stories/media/${currentStory.mediaUrl
                                    .split("/")
                                    .pop()}`}
                                style={styles.media}
                                token={token}
                            />
                        )}
                    </div>
                )}

                {/* Text overlays */}
                {currentStory.textBoxes?.map((textBox) => (
                    <div
                        key={textBox.id}
                        style={{
                            ...styles.textOverlay,
                            left: `${textBox.position.x}%`,
                            top: `${textBox.position.y}%`,
                        }}
                    >
                        {textBox.content}
                    </div>
                ))}

                {/* Drawing overlays */}
                {currentStory.drawings?.length > 0 && (
                    <svg
                        style={styles.drawingOverlay}
                        viewBox='0 0 100 100'
                        preserveAspectRatio='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        {currentStory.drawings.map((drawing, index) => {
                            return (
                                <polyline
                                    key={index}
                                    points={drawing.path
                                        .map((point) => `${point.x},${point.y}`)
                                        .join(" ")}
                                    fill='none'
                                    stroke={drawing.color || "#ffffff"}
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth='0.5'
                                    strokeOpacity='1'
                                />
                            )
                        })}
                    </svg>
                )}

                {/* Navigation Arrows */}
                {currentStoryIndex > 0 && (
                    <button
                        style={{
                            ...styles.navigationArrow,
                            ...styles.leftArrow,
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            previousStory()
                        }}
                        onMouseEnter={(e) => (e.target.style.opacity = "1")}
                        onMouseLeave={(e) => (e.target.style.opacity = "0.8")}
                        title='Previous story'
                    >
                        ‹
                    </button>
                )}

                {currentStoryIndex < stories.length - 1 && (
                    <button
                        style={{
                            ...styles.navigationArrow,
                            ...styles.rightArrow,
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            nextStory()
                        }}
                        onMouseEnter={(e) => (e.target.style.opacity = "1")}
                        onMouseLeave={(e) => (e.target.style.opacity = "0.8")}
                        title='Next story'
                    >
                        ›
                    </button>
                )}

                {/* Pause/Play Button */}
                <button
                    style={styles.pausePlayButton}
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        togglePause()
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                    }}
                    onMouseUp={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                    }}
                    onMouseEnter={(e) => (e.target.style.opacity = "1")}
                    onMouseLeave={(e) => (e.target.style.opacity = "0.9")}
                    title={isPaused ? "Play" : "Pause"}
                >
                    {isPaused ? "▶" : "⏸"}
                </button>

                {/* Views Button - Only show for own stories */}
                {isOwnStories && (
                    <button
                        style={{
                            ...styles.actionButton,
                            ...styles.viewsButton,
                        }}
                        onClick={handleViewsClick}
                        onMouseEnter={(e) => (e.target.style.opacity = "1")}
                        onMouseLeave={(e) => (e.target.style.opacity = "0.9")}
                        title='View story views'
                    >
                        👁
                    </button>
                )}

                {/* Share Button */}
                <button
                    style={{
                        ...styles.actionButton,
                        ...styles.shareButton,
                    }}
                    onClick={handleShareClick}
                    onMouseEnter={(e) => (e.target.style.opacity = "1")}
                    onMouseLeave={(e) => (e.target.style.opacity = "0.9")}
                    title='Share story'
                >
                    📤
                </button>

                {/* Delete Button - Only show for own stories */}
                {isOwnStories && (
                    <button
                        style={{
                            ...styles.actionButton,
                            ...styles.deleteButton,
                        }}
                        onClick={handleDeleteClick}
                        onMouseEnter={(e) => (e.target.style.opacity = "1")}
                        onMouseLeave={(e) => (e.target.style.opacity = "0.9")}
                        title='Delete story'
                    >
                        🗑
                    </button>
                )}
            </div>

            {/* Views Modal */}
            {showViewsModal && (
                <div
                    style={styles.modal}
                    onClick={handleModalClose}
                >
                    <div
                        style={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={styles.modalHeader}>Story Views</div>
                        {viewsLoading ? (
                            <div style={{ textAlign: "center", padding: "20px" }}>
                                <Spinner
                                    size={24}
                                    withStyles={false}
                                />
                            </div>
                        ) : storyViews.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                                No views yet
                            </div>
                        ) : (
                            <div>
                                {storyViews.map((view) => (
                                    <div
                                        key={view._id}
                                        style={styles.viewItem}
                                    >
                                        <div style={styles.viewAvatar}>
                                            {view.profilePicture ? (
                                                <img
                                                    src={`${BASE_URL}/uploads/profilePics/${view.profilePicture}`}
                                                    style={styles.viewAvatar}
                                                />
                                            ) : (
                                                <div style={styles.viewAvatar} />
                                            )}
                                        </div>
                                        <div style={styles.viewUsername}>
                                            {view.username || "Unknown User"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={styles.modalButtons}>
                            <button
                                style={{
                                    ...styles.modalButton,
                                    ...styles.closeModalButton,
                                }}
                                onClick={handleModalClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                shareType='story'
                shareData={currentStory}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div
                    style={styles.modal}
                    onClick={handleModalClose}
                >
                    <div
                        style={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={styles.modalHeader}>Delete Story</div>
                        <div style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
                            Are you sure you want to delete this story? This action cannot be
                            undone.
                        </div>
                        <div style={styles.modalButtons}>
                            <button
                                style={{
                                    ...styles.modalButton,
                                    ...styles.cancelButton,
                                }}
                                onClick={handleModalClose}
                            >
                                Cancel
                            </button>
                            <button
                                style={{
                                    ...styles.modalButton,
                                    ...styles.confirmButton,
                                }}
                                onClick={handleDeleteConfirm}
                                disabled={deleteStoryMutation.isPending}
                            >
                                {deleteStoryMutation.isPending ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    )
}

export default UserStoriesPage
