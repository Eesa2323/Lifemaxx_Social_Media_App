import React, { useState, useEffect, useRef } from "react"
import { data, useLocation, useNavigate, useParams } from "react-router-dom"
import { FaArrowLeft, FaEllipsisH, FaUsers, FaPaperclip, FaTimes } from "react-icons/fa"
import { FaRegPaperPlane } from "react-icons/fa"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import Skeleton from "../components/Skeleton"
import Input from "../components/Input"
import { produce } from "immer"
import Like from "../components/Like"
import PostComments from "../components/PostComments"
import { useSelector } from "react-redux"
import Modal from "../components/Modal"
import axios from "../utils/axios"
import MentionText from "../components/MentionText"
import useMentionAutocomplete from "../hooks/useMentionAutocomplete"
import MentionAutocomplete from "../components/MentionAutocomplete"
import ShareModal from "../components/ShareModal"
import { Modal as MuiModal } from "@mui/material"
import UnauthorizedLoginPopupModal from "../components/UnauthorizedLoginPopupModal"
import Spinner from "../components/Spinner"
import ProfilePic from "../components/ProfilePic"

// Image component with loading placeholder
const ImageWithPlaceholder = ({ src, alt, style, onClick }) => {
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState(false)

    // Extract border from style to avoid applying it to skeleton
    const { border, ...styleWithoutBorder } = style || {}

    return (
        <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
            {!loaded && !error && (
                <Skeleton
                    variant='card'
                    style={{
                        ...styleWithoutBorder,
                        border: "none",
                    }}
                />
            )}
            <img
                src={src}
                alt={alt}
                style={{
                    ...style,
                    opacity: loaded ? 1 : 0,
                    transition: "opacity 0.2s ease-in",
                    display: "block",
                    position: loaded ? "static" : "absolute",
                    top: 0,
                    left: 0,
                }}
                onLoad={() => setLoaded(true)}
                onError={() => {
                    setError(true)
                    setLoaded(false)
                }}
                onClick={onClick}
            />
        </div>
    )
}

// Mock Data
const communityInfo = {
    name: "r/BestofRedditorUpdates",
    author: "Choice_Evidence1983",
    time: "1 day ago",
    flair: "Top 1% Poster",
    nsfw: true,
    postTitle:
        "[New Update]: AIO for getting pissed that someone had sex in my truck at the dealership???",
}

const comments = [
    {
        id: 1,
        author: "AutoModerator",
        time: "1 day ago",
        text: "Stickied comment",
        isStickied: true,
    },
    {
        id: 2,
        author: "2006bruin",
        time: "1 day ago",
        text: "I love that OOP basically names the dealership: stay away from the only Ford dealership in Surprise Arizona 85388.",
        votes: 6800,
        replies: [
            {
                id: 3,
                author: "Hornt8r",
                time: "1 day ago",
                text: "Surprise Ford owned by. https://www.berkshirehathawayautomotive.com/",
                votes: 2700,
                replies: [],
            },
            {
                id: 4,
                author: "EntireKangaroo148",
                time: "1 day ago",
                text: "shhhh my soaps are on... There is a financial writer I read who apparently gets great results...",
                votes: 2100,
                replies: [],
            },
        ],
    },
]

const VideoPlayer = ({ src }) => {
    const videoRef = useRef(null)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(true)
    const [showControls, setShowControls] = useState(false)

    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        if (v.readyState >= 1) {
            try {
                if (v.currentTime < 0.04) v.currentTime = 0.05
            } catch {}
            setHasLoaded(true)
        }
    }, [src])

    return (
        <div
            style={{
                width: 300,
                height: 200,
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                margin: "16px 0",
                position: "relative",
                overflow: "hidden",
            }}
            onMouseEnter={() => isPlaying && setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onTouchStart={() => isPlaying && setShowControls((prev) => !prev)}
        >
            <video
                ref={videoRef}
                width={"100%"}
                height={"100%"}
                style={{
                    borderRadius: 8,
                    objectFit: "cover",
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
                    if (v && v.readyState >= 1) return
                    setHasLoaded(false)
                    try {
                        if (v) v.currentTime = 0
                    } catch {}
                }}
                onLoadedMetadata={() => {
                    const v = videoRef.current
                    if (v) {
                        try {
                            if (v.currentTime < 0.04) v.currentTime = 0.05
                        } catch {}
                    }
                    setHasLoaded(true)
                }}
                onLoadedData={() => setHasLoaded(true)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                    setHasLoaded(true)
                    setIsPlaying(false)
                }}
            >
                <source src={src} />
            </video>

            {hasLoaded && isPlaying && showControls && (
                <>
                    <button
                        type='button'
                        style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 32,
                            height: 32,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                            zIndex: 2,
                        }}
                        onClick={() => {
                            const v = videoRef.current
                            if (!v) return
                            if (v.paused) v.play().catch(() => {})
                            else v.pause()
                        }}
                        aria-label={isPlaying ? "Pause video" : "Play video"}
                    >
                        {isPlaying ? (
                            <svg
                                width='14'
                                height='14'
                                viewBox='0 0 24 24'
                                fill='none'
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
                                width='14'
                                height='14'
                                viewBox='0 0 24 24'
                                fill='none'
                            >
                                <polygon
                                    points='6,4 20,12 6,20'
                                    fill='white'
                                />
                            </svg>
                        )}
                    </button>

                    <button
                        type='button'
                        style={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            width: 32,
                            height: 32,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                            zIndex: 2,
                        }}
                        onClick={() => setIsMuted((m) => !m)}
                        aria-label={isMuted ? "Unmute video" : "Mute video"}
                    >
                        {isMuted ? (
                            <svg
                                width='14'
                                height='14'
                                viewBox='0 0 24 24'
                                fill='none'
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
                                width='14'
                                height='14'
                                viewBox='0 0 24 24'
                                fill='none'
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

            {hasLoaded && !isPlaying && (
                <button
                    type='button'
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        cursor: "pointer",
                        zIndex: 2,
                    }}
                    onClick={() => {
                        const v = videoRef.current
                        if (!v) return
                        setTimeout(() => v.play().catch(() => {}), 20)
                    }}
                    aria-label='Play video'
                >
                    <svg
                        width='48'
                        height='48'
                        viewBox='0 0 48 48'
                        fill='none'
                    >
                        <polygon
                            points='20,16 34,24 20,32'
                            fill='#fff'
                        />
                    </svg>
                </button>
            )}
        </div>
    )
}

const CommunityChat = () => {
    const { communityId } = useParams()
    const messagesEndRef = useRef(null)
    const [message, setMessage] = useState("")
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const location = useLocation()
    const { state } = location
    const axiosPrivate = useAxiosPrivate()
    const navigate = useNavigate()
    const [replyText, setReplyText] = useState("")
    const [imagePreview, setImagePreview] = useState(null)
    const [attachedFile, setAttachedFile] = useState(null)
    const fileInputRef = useRef(null)
    const textareaRef = useRef(null)
    const queryClient = useQueryClient()
    const userData = useSelector((state) => state.auth.userData)
    const token = useSelector((state) => state.auth.token)
    const [sort, setSort] = useState("latest")
    const [showVideoPreview, setShowVideoPreview] = useState(false)
    const [showVideoMap, setShowVideoMap] = useState({})
    const [commentGateError, setCommentGateError] = useState("")
    const [showShareModal, setShowShareModal] = useState(false)
    const [showJourneyShareModal, setShowJourneyShareModal] = useState(false)
    const [selectedPost, setSelectedPost] = useState(null)
    const [createError, setCreateError] = useState("")
    const [showMembersModal, setShowMembersModal] = useState(false)
    const [showLoginPrompt, setShowLoginPrompt] = useState(false)
    const [descExpanded, setDescExpanded] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    // Lightbox for image preview (centered, responsive)
    const [imageLightbox, setImageLightbox] = useState({ open: false, src: null, alt: "" })

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const formatRelativeTime = (dateLike) => {
        if (!dateLike) return ""
        const d = new Date(dateLike)
        if (isNaN(d)) return String(dateLike)
        const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
        if (diffSec < 60) return `${diffSec}s`
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`
        if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)}d`
        return `${Math.floor(diffSec / (7 * 86400))}w`
    }

    // Mention autocomplete
    const {
        showMentionPopup,
        mentionSearchTerm,
        mentionPosition,
        handleInputChange: handleMentionInputChange,
        handleMentionSelect,
        closeMentionPopup,
    } = useMentionAutocomplete((newValue) => setReplyText(newValue), textareaRef)

    const {
        data: posts,
        isFetching: isPostsFetching,
        isLoading: isPostsLoading,
        isFetchingNextPage: isPostsFetchingNextPage,
        fetchNextPage: fetchNextPagePosts,
        hasNextPage: postsHasNextPage,
    } = useInfiniteQuery({
        queryKey: ["communityPosts", communityId, sort],
        initialPageParam: undefined,
        queryFn: async ({ pageParam = null }) => {
            const response = await axios.get(`${BASE_URL}/api/communities/posts`, {
                params: { cursor: pageParam, id: communityId, sort },
                headers: { "x-auth-token": token },
            })
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: Infinity,
        enabled: !!communityId,
    })

    // sentinel for loading next page when it scrolls into view
    const loadMoreRef = useRef(null)

    useEffect(() => {
        const el = loadMoreRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (postsHasNextPage && !isPostsFetchingNextPage) {
                            fetchNextPagePosts()
                        }
                    }
                })
            },
            { root: null, rootMargin: "400px", threshold: 0.1 },
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [fetchNextPagePosts, postsHasNextPage, isPostsFetchingNextPage])

    const createPost = useMutation({
        mutationFn: async ({ file, caption }) => {
            const formData = new FormData()
            file && formData.append("file", file)
            caption && formData.append("caption", caption)
            const result = await axiosPrivate.post(
                `${BASE_URL}/api/communities/${communityId}`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                },
            )
            return result.data
        },
        onMutate: () => {
            setCreateError("")
        },
        onSuccess: (data) => {
            setCreateError("")
            queryClient.setQueryData(["communityPosts", communityId, sort], (oldData) => {
                return produce(oldData, (draft) => {
                    if (!oldData) return
                    else if (!draft.pages.length)
                        draft.pages.push({ data: [data.post], nextCursor: null })
                    else draft.pages[0].data.unshift(data.post)
                })
            })
            setImagePreview(null)
            setReplyText("")
            setAttachedFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ""
        },
        onError: (err) => {
            setCreateError(
                err?.response?.data || err?.message || "Failed to create post. Please try again.",
            )
        },
    })

    const {
        data: community,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["community", communityId],
        queryFn: async () => {
            const res = await axiosPrivate.get(`${BASE_URL}/api/communities/${communityId}`)
            return res.data
        },
        initialData: state?.community,
        staleTime: 4 * 60 * 1000,
        gcTime: 3 * 60 * 1000,
        enabled: !!communityId,
        keepPreviousData: true,
    })

    // Description overflow detection (must be after `community` is initialized)
    const descRef = useRef(null)
    const [descOverflowing, setDescOverflowing] = useState(false)

    useEffect(() => {
        if (!community?.description || descExpanded) {
            setDescOverflowing(false)
            return
        }
        const el = descRef.current
        if (!el) return
        const checkOverflow = () => {
            setDescOverflowing(el.scrollHeight > el.clientHeight + 1)
        }
        checkOverflow()
        window.addEventListener("resize", checkOverflow)
        return () => window.removeEventListener("resize", checkOverflow)
    }, [community?.description, descExpanded, isFetching])

    useEffect(() => {
        const resetState = () => {
            return navigate(`/communities/${communityId}`, { replace: true }, { state: null })
        }

        window.addEventListener("beforeunload", resetState)

        return () => window.removeEventListener("beforeunload", resetState)
    }, [navigate, communityId])

    const isMember = community?.isMember

    // Mock user
    const mockUser = {
        id: "123",
        displayName: "John Doe",
        photoURL: null,
    }

    // Mock community data
    const mockCommunity = {
        id: communityId,
        title: "Sample Community",
        category: "fitness",
        memberCount: 150,
    }

    useEffect(() => {
        const loadMockMessages = async () => {
            try {
                // Simulate API delay
                await new Promise((resolve) => setTimeout(resolve, 1000))

                // Mock messages
                const mockMessages = [
                    {
                        id: "1",
                        text: "Welcome to the community!",
                        userId: "admin",
                        userName: "Admin",
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                    },
                    {
                        id: "2",
                        text: "Hey everyone!",
                        userId: "123",
                        userName: "John Doe",
                        timestamp: new Date(Date.now() - 3600000).toISOString(),
                    },
                ]

                setMessages(mockMessages)
                setLoading(false)
            } catch (err) {
                console.error("Error loading messages:", err)
                setError("Failed to load messages")
                setLoading(false)
            }
        }

        loadMockMessages()
    }, [communityId])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!message.trim()) return

        const newMessage = {
            id: Date.now().toString(),
            text: message.trim(),
            userId: mockUser.id,
            userName: mockUser.displayName,
            timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, newMessage])
        setMessage("")
    }

    const handleShowVideo = (postId) => {
        setShowVideoMap((prev) => ({ ...prev, [postId]: true }))
    }

    // Join community mutation
    const joinMutation = useMutation({
        mutationFn: async () => {
            const res = await axiosPrivate.post(`${BASE_URL}/api/communities/join/${communityId}`)
            return res.data
        },
        onSuccess: () => {
            setCommentGateError("")
            // Directly update isMember and memberCount in the cached community object
            queryClient.setQueryData(["community", communityId], (old) => {
                if (!old) return old
                return {
                    ...old,
                    isMember: true,
                    memberCount: (old.memberCount || 0) + 1,
                }
            })
        },
        onError: (err) => {
            setCommentGateError(err?.response?.data?.message || "Failed to join community.")
        },
    })

    // Leave community mutation
    const leaveMutation = useMutation({
        mutationFn: async () => {
            // TODO: If you keep getting 'Failed to leave community.', check backend logic and ensure user is a member before calling this.
            const res = await axiosPrivate.post(`${BASE_URL}/api/communities/leave/${communityId}`)
            return res.data
        },
        onSuccess: () => {
            setCommentGateError("")
            // Directly update isMember and memberCount in the cached community object
            queryClient.setQueryData(["community", communityId], (old) => {
                if (!old) return old
                return {
                    ...old,
                    isMember: false,
                    memberCount: Math.max((old.memberCount || 1) - 1, 0),
                }
            })
        },
        onError: (err) => {
            setCommentGateError(err?.response?.data?.message || "Failed to leave community.")
        },
    })

    // Handler for Join button in modal or top section
    const handleJoinCommunity = () => {
        setCommentGateError("")
        joinMutation.mutate()
    }

    // Handler for Leave button
    const handleLeaveCommunity = () => {
        setCommentGateError("")
        leaveMutation.mutate()
    }

    // Handle image or video selection and preview
    const onFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setAttachedFile(file)
        setImagePreview(null)
        if (file.type.startsWith("image/")) {
            const reader = new FileReader()
            reader.onload = (evt) => setImagePreview({ type: "image", src: evt.target.result })
            reader.readAsDataURL(file)
        } else if (file.type.startsWith("video/")) {
            const videoUrl = URL.createObjectURL(file)
            setImagePreview({ type: "video", src: videoUrl })
        }
        // Reset file input value so selecting the same file again triggers onChange
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    // Clear preview
    const clearImage = () => {
        setImagePreview(null)
        setAttachedFile(null)
    }

    if (!communityId) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>No community ID</div>
            </div>
        )
    }

    return (
        <div className='page-wrapper community-chat-page'>
            {isFetching ? (
                <div>
                    {/* Header skeleton (post card) */}
                    <div style={styles.postCard}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Skeleton
                                variant='title'
                                style={{ width: 27, height: 27, borderRadius: "50%" }}
                            />
                            <div style={{ flex: 1 }}>
                                <Skeleton
                                    variant='title'
                                    style={{ height: 20, width: "50%" }}
                                />
                                <Skeleton
                                    variant='title'
                                    style={{ height: 12, width: "30%", marginTop: 6 }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <Skeleton
                                variant='card'
                                style={{ height: 40 }}
                            />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <div style={styles.postActions}>
                                <Skeleton
                                    variant='title'
                                    style={{ width: 90, height: 22 }}
                                />
                                <Skeleton
                                    variant='title'
                                    style={{ width: 60, height: 22 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Reply box skeleton */}
                    <div style={styles.replyBoxFull}>
                        <Skeleton
                            variant='card'
                            style={{ height: 120 }}
                        />
                    </div>

                    {/* Posts skeletons */}
                    <div style={styles.commentsSection}>
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div
                                key={idx}
                                style={styles.commentContainer}
                            >
                                <Skeleton
                                    variant='card'
                                    style={{ height: 100 }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                community?._id && (
                    <>
                        <div style={styles.postCard}>
                            {token && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 13,
                                        right: 10,
                                        textAlign: "right",
                                    }}
                                >
                                    {isMember ? (
                                        <button
                                            style={{
                                                background: "#333",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 6,
                                                padding: "4px 16px",
                                                fontWeight: 600,
                                                fontSize: 13,
                                                cursor:
                                                    leaveMutation.isLoading || isFetching
                                                        ? "not-allowed"
                                                        : "pointer",
                                                opacity:
                                                    leaveMutation.isLoading || isFetching ? 0.7 : 1,
                                            }}
                                            onClick={handleLeaveCommunity}
                                            disabled={leaveMutation.isLoading || isFetching}
                                        >
                                            {leaveMutation.isLoading || isFetching ? (
                                                <span>Leaving...</span>
                                            ) : (
                                                <span>Leave</span>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            style={{
                                                background: "var(--primary)",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 6,
                                                padding: "4px 16px",
                                                fontWeight: 600,
                                                fontSize: 13,
                                                cursor:
                                                    leaveMutation.isLoading || isFetching
                                                        ? "not-allowed"
                                                        : "pointer",
                                                opacity:
                                                    leaveMutation.isLoading || isFetching ? 0.7 : 1,
                                            }}
                                            onClick={handleJoinCommunity}
                                            disabled={joinMutation.isLoading || isFetching}
                                        >
                                            {joinMutation.isLoading || isFetching ? (
                                                <span>Joining...</span>
                                            ) : (
                                                <span>Join</span>
                                            )}
                                        </button>
                                    )}
                                    {isFetching && (
                                        <div style={{ color: "#aaa", fontSize: 13, marginTop: 2 }}>
                                            Updating...
                                        </div>
                                    )}
                                    {commentGateError && (
                                        <div
                                            style={{
                                                color: "#ff4444",
                                                fontSize: 13,
                                                margin: "4px 0 8px 0",
                                            }}
                                        >
                                            {commentGateError}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div style={styles.postMetaTop}>
                                <ProfilePic
                                    size={27}
                                    src={`${BASE_URL}/uploads/profilePics/${community?.creator?.profilePic}`}
                                />
                                <span style={styles.author}>{community?.creator?.username}</span>
                            </div>
                            <h3
                                style={{
                                    ...styles.postTitle,
                                    wordWrap: "break-word",
                                    overflowWrap: "break-word",
                                    whiteSpace: "normal",
                                    lineHeight: "1.3",
                                }}
                                title={community?.name || ""}
                            >
                                {community?.name || ""}
                            </h3>
                            {community?.description && (
                                <div style={{ position: "relative" }}>
                                    {!descExpanded ? (
                                        <div
                                            ref={descRef}
                                            style={{
                                                ...styles.postDescriptionCollapsed,
                                            }}
                                        >
                                            {community.description}
                                        </div>
                                    ) : (
                                        <div>
                                            <p style={styles.postDescription}>
                                                {community.description}
                                            </p>
                                            <button
                                                onClick={() => setDescExpanded(false)}
                                                aria-label='Show less description'
                                                title='Show less'
                                                style={styles.showLessBtn}
                                            >
                                                Show less
                                            </button>
                                        </div>
                                    )}
                                    {!descExpanded && descOverflowing && (
                                        <button
                                            onClick={() => setDescExpanded(true)}
                                            aria-expanded={false}
                                            style={styles.showLessBtn}
                                        >
                                            Show more
                                        </button>
                                    )}
                                </div>
                            )}
                            <div style={styles.postActions}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        color: "#aaa",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => {
                                        if (!token) {
                                            setShowLoginPrompt(true)
                                            return
                                        }
                                        setShowMembersModal(true)
                                    }}
                                >
                                    <FaUsers style={{ fontSize: "16px" }} />
                                    <span>{community?.memberCount || 0} members</span>
                                </div>
                                <button
                                    style={styles.actionBtn}
                                    onClick={() => setShowShareModal(true)}
                                >
                                    Share
                                </button>
                            </div>

                            {/* Date (short) and category tag below members/share */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    marginTop: 8,
                                }}
                            >
                                <span
                                    style={{
                                        backgroundColor: "#333",
                                        color: "#fff",
                                        padding: "4px 8px",
                                        borderRadius: 12,
                                        fontSize: 12,
                                        fontWeight: 500,
                                    }}
                                >
                                    {community?.category || ""}
                                </span>
                            </div>
                        </div>

                        {/* Conversation Input */}
                        <div style={styles.inputSection}>
                            {createError && (
                                <div
                                    style={{
                                        color: "#ff6666",
                                        fontSize: 13,
                                        marginTop: 44, // leave space under the button row
                                    }}
                                >
                                    {createError}
                                </div>
                            )}
                            {/* <Input
                                placeholder={"Join the conversation"}
                                type={"text"}
                                hasFile={true}
                                style={styles.inputField}
                            /> */}
                            {/* Reply Box with Image Attachment */}

                            <div style={styles.replyBoxFull}>
                                <div style={{ position: "relative" }}>
                                    <textarea
                                        ref={textareaRef}
                                        spellCheck='false'
                                        style={{
                                            ...styles.textarea,
                                            paddingTop: imagePreview ? "200px" : "30px",
                                            opacity: !token || !isMember ? 0.5 : 1,
                                            cursor: !token || !isMember ? "not-allowed" : "text",
                                        }}
                                        placeholder={
                                            !token
                                                ? "Please login to comment..."
                                                : !isMember
                                                  ? "Please join the community to comment..."
                                                  : "Add a comment"
                                        }
                                        value={replyText}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setReplyText(value)
                                            handleMentionInputChange(value, e)
                                        }}
                                        disabled={!token || !isMember}
                                    />
                                    <MentionAutocomplete
                                        isVisible={showMentionPopup}
                                        searchTerm={mentionSearchTerm}
                                        onSelectUser={handleMentionSelect}
                                        onClose={closeMentionPopup}
                                        position={mentionPosition}
                                        inputRef={textareaRef}
                                    />
                                </div>
                                {/* Image preview inside textarea area */}
                                {imagePreview && (
                                    <div style={styles.imagePreviewInline}>
                                        {imagePreview.type === "image" ? (
                                            <img
                                                src={imagePreview.src}
                                                alt='preview'
                                                style={{
                                                    ...styles.imagePreview,
                                                    cursor: "pointer",
                                                }}
                                                onClick={() =>
                                                    setImageLightbox({
                                                        open: true,
                                                        src: imagePreview.src,
                                                        alt: "preview",
                                                    })
                                                }
                                            />
                                        ) : imagePreview.type === "video" ? (
                                            <div
                                                style={{
                                                    ...styles.videoPreview,
                                                    background: "black",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    padding: 10,
                                                    justifyContent: "center",
                                                    position: "relative",
                                                }}
                                            >
                                                <svg
                                                    width='60'
                                                    height='60'
                                                    viewBox='0 0 48 48'
                                                    fill='none'
                                                    xmlns='http://www.w3.org/2000/svg'
                                                >
                                                    <circle
                                                        cx='24'
                                                        cy='24'
                                                        r='24'
                                                        fill='rgba(0,0,0,0.5)'
                                                    />
                                                    <polygon
                                                        points='20,16 34,24 20,32'
                                                        fill='#fff'
                                                    />
                                                </svg>
                                            </div>
                                        ) : null}
                                        <button
                                            style={styles.clearBtn}
                                            onClick={clearImage}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                )}
                                {/* Attachment icon */}
                                <FaPaperclip
                                    style={{
                                        ...styles.attachIcon,
                                        opacity: !token || !isMember ? 0.5 : 1,
                                        cursor: !token || !isMember ? "not-allowed" : "pointer",
                                    }}
                                    onClick={() => {
                                        if (!token || !isMember) return
                                        fileInputRef.current.click()
                                    }}
                                />
                                <input
                                    type='file'
                                    ref={fileInputRef}
                                    style={styles.hiddenFileInput}
                                    accept='image/*, video/*'
                                    onChange={onFileChange}
                                />

                                <button
                                    onClick={() => {
                                        if (!token || !isMember) return
                                        if (!imagePreview && !replyText.trim()) return
                                        createPost.mutate({
                                            file: attachedFile,
                                            caption: replyText,
                                        })
                                    }}
                                    style={{
                                        ...styles.replyButtonFull,
                                        fontSize: 13,
                                        background:
                                            !token ||
                                            !isMember ||
                                            createPost.isLoading ||
                                            (!imagePreview && !replyText.trim())
                                                ? "#444"
                                                : "#0079d3",
                                        cursor:
                                            !token ||
                                            !isMember ||
                                            createPost.isLoading ||
                                            (!imagePreview && !replyText.trim())
                                                ? "not-allowed"
                                                : "pointer",
                                        opacity: createPost.isLoading ? 0.8 : 1,
                                    }}
                                    disabled={
                                        !token ||
                                        !isMember ||
                                        createPost.isLoading ||
                                        (!imagePreview && !replyText.trim())
                                    }
                                >
                                    {createPost.isLoading ? "Posting..." : "Comment"}
                                </button>
                                {/* Create post error (bottom of create section) */}
                            </div>
                        </div>

                        {/* Sort Bar */}
                        <div style={styles.sortBar}>
                            <span>Sort by:</span>
                            <select
                                style={styles.sortSelect}
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                            >
                                <option value='latest'>Latest</option>
                                <option value='oldest'>Oldest</option>
                            </select>
                        </div>

                        {/* Comments Section */}
                        <div style={styles.commentsSection}>
                            {isPostsLoading
                                ? Array.from({ length: 3 }).map((_, idx) => (
                                      <div
                                          key={idx}
                                          style={styles.commentContainer}
                                      >
                                          <Skeleton
                                              variant='card'
                                              style={{ height: 120 }}
                                          />
                                      </div>
                                  ))
                                : posts?.pages
                                      ?.flatMap((page) => page?.data || [])
                                      .map((post) => {
                                          const isImage =
                                              post.url && post.url.match(/\.(jpeg|jpg|gif|png)$/i)
                                          const isVideo =
                                              post.url && post.url.match(/\.(mp4|webm|ogg)$/i)
                                          const showVideo = !!showVideoMap[post._id]
                                          return (
                                              <div
                                                  key={post._id}
                                                  style={styles.commentContainer}
                                              >
                                                  <div style={styles.commentCard}>
                                                      <div style={styles.commentHeader}>
                                                          <div
                                                              style={{
                                                                  display: "flex",
                                                                  gap: 7,
                                                              }}
                                                          >
                                                              <ProfilePic
                                                                  size={26}
                                                                  src={
                                                                      post?.creator?.profilePic
                                                                          ? `${BASE_URL}/uploads/profilePics/${post?.creator?.profilePic}`
                                                                          : null
                                                                  }
                                                              />
                                                              <span
                                                                  style={{
                                                                      ...styles.commentAuthor,
                                                                      ...{ marginTop: 5 },
                                                                  }}
                                                              >
                                                                  {post.creator.username}
                                                              </span>
                                                          </div>
                                                          {/* Delete button if post creator is current user */}
                                                          {userData?._id ===
                                                              (post.creator?._id ??
                                                                  post?.creator) && (
                                                              <button
                                                                  style={{
                                                                      marginLeft: "auto",
                                                                      color: "#ff4444",
                                                                      background: "none",
                                                                      border: "none",
                                                                      cursor: "pointer",
                                                                  }}
                                                                  onClick={async () => {
                                                                      await axiosPrivate.delete(
                                                                          `${BASE_URL}/api/communities/posts/${post._id}`,
                                                                      )
                                                                      queryClient.setQueryData(
                                                                          [
                                                                              "communityPosts",
                                                                              communityId,
                                                                              sort,
                                                                          ],
                                                                          (oldData) => {
                                                                              return produce(
                                                                                  oldData,
                                                                                  (draft) => {
                                                                                      if (!oldData)
                                                                                          return
                                                                                      draft.pages.forEach(
                                                                                          (
                                                                                              page,
                                                                                          ) => {
                                                                                              page.data =
                                                                                                  page.data.filter(
                                                                                                      (
                                                                                                          p,
                                                                                                      ) =>
                                                                                                          p._id !==
                                                                                                          post._id,
                                                                                                  )
                                                                                          },
                                                                                      )
                                                                                  },
                                                                              )
                                                                          },
                                                                      )
                                                                  }}
                                                              >
                                                                  Delete
                                                              </button>
                                                          )}
                                                      </div>
                                                      <p style={styles.commentText}>
                                                          <MentionText text={post.caption} />
                                                      </p>
                                                      {post.url &&
                                                          (isImage ? (
                                                              <ImageWithPlaceholder
                                                                  src={`${BASE_URL}${post.url}`}
                                                                  alt='post media'
                                                                  style={{
                                                                      maxWidth: 180,
                                                                      maxHeight: 180,
                                                                      borderRadius: 8,
                                                                      border: "1px solid #333",
                                                                      margin: "5px 0",
                                                                      cursor: "pointer",
                                                                      width: "100%",
                                                                      height: "auto",
                                                                  }}
                                                                  onClick={() =>
                                                                      setImageLightbox({
                                                                          open: true,
                                                                          src: `${BASE_URL}${post.url}`,
                                                                          alt:
                                                                              post.caption ||
                                                                              "image",
                                                                      })
                                                                  }
                                                              />
                                                          ) : isVideo ? (
                                                              <VideoPlayer
                                                                  src={`${BASE_URL}${post.url}`}
                                                              />
                                                          ) : null)}
                                                      <div style={styles.commentActions}>
                                                          <Like
                                                              post={post}
                                                              cacheKey={[
                                                                  "communityPosts",
                                                                  communityId,
                                                                  sort,
                                                              ]}
                                                              isMember={isMember}
                                                              checkCommunity={true}
                                                          />
                                                          <PostComments
                                                              post={post}
                                                              isMember={isMember}
                                                              checkCommunity={true}
                                                          />

                                                          <span>{post.votes ?? ""}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                          )
                                      })}

                            {/* sentinel element to trigger loading next page when visible */}
                            <div ref={loadMoreRef} />

                            {/* show spinner at bottom while fetching next page */}
                            {isPostsFetchingNextPage && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        padding: 12,
                                    }}
                                >
                                    <Spinner
                                        withStyles={false}
                                        size={28}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )
            )}

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                shareData={community}
                shareType='community'
            />

            {/* Unauthorized login prompt */}
            <UnauthorizedLoginPopupModal
                isOpen={showLoginPrompt}
                onClose={() => setShowLoginPrompt(false)}
                title='Login Required'
                message='Please log in to view community members.'
            />

            {/* Members Modal (MUI) - full screen on mobile) */}
            <MuiModal
                open={showMembersModal}
                onClose={() => setShowMembersModal(false)}
                aria-labelledby='community-members-modal'
                sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <div
                    style={{
                        backgroundColor: "#121212",
                        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
                        padding: isMobile ? "16px" : "24px",
                        outline: "none",
                        borderRadius: isMobile ? "0" : "8px",
                        maxWidth: isMobile ? "100%" : "560px",
                        width: isMobile ? "100%" : "90%",
                        /* Desktop: fixed to 50vh, clamp between 200px and 500px */
                        height: isMobile ? "100vh" : "50vh",
                        maxHeight: isMobile ? "100vh" : 500,
                        minHeight: isMobile ? "100vh" : 200,
                        position: isMobile ? "fixed" : "relative",
                        top: isMobile ? 0 : "auto",
                        left: isMobile ? 0 : "auto",
                        right: isMobile ? 0 : "auto",
                        bottom: isMobile ? 0 : "auto",
                        paddingBottom: isMobile ? "20px" : "16px",
                        boxSizing: "border-box",
                        overflowY: "auto",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>
                            Members
                        </h2>
                        <div style={{ marginLeft: "auto" }}>
                            <button
                                onClick={() => setShowMembersModal(false)}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#aaa",
                                    cursor: "pointer",
                                    fontSize: 18,
                                }}
                                aria-label='Close'
                                title='Close'
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                    <div style={{ borderBottom: "1px solid #222", margin: "8px 0 12px" }} />

                    {communityId && (
                        <MembersList
                            communityId={communityId}
                            axiosPrivate={axiosPrivate}
                        />
                    )}
                </div>
            </MuiModal>

            {/* Image lightbox overlay */}
            {imageLightbox.open && (
                <div
                    onClick={() => setImageLightbox({ open: false, src: null })}
                    style={{
                        position: "fixed",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.95)",
                        zIndex: 3000,
                    }}
                >
                    {/* Close button pinned to viewport */}
                    <button
                        onClick={() => setImageLightbox({ open: false, src: null })}
                        aria-label='Close image'
                        style={{
                            position: "fixed",
                            top: 16,
                            right: 16,
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            border: "none",
                            background: "rgba(255,255,255,0.08)",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: 22,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 3001,
                        }}
                    >
                        ×
                    </button>

                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: "95vw",
                            maxHeight: "95vh",
                            width: "auto",
                            height: "auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 12,
                            position: "relative",
                        }}
                    >
                        <ImageWithPlaceholder
                            src={imageLightbox.src}
                            alt={imageLightbox.alt}
                            style={{
                                display: "block",
                                maxWidth: "100%",
                                maxHeight: "100%",
                                width: "auto",
                                height: "auto",
                                objectFit: "contain",
                                borderRadius: 8,
                                boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Journey Share Modal */}
            {/* <ShareModal
                isOpen={showJourneyShareModal}
                onClose={() => {
                    setShowJourneyShareModal(false)
                    setSelectedPost(null)
                }}
                shareData={selectedPost}
                shareType='journey'
            /> */}
        </div>
    )
}

function MembersList({ communityId, axiosPrivate }) {
    const [loadedImages, setLoadedImages] = useState({})

    const { data, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ["communityMembers", communityId],
        queryFn: async ({ pageParam = undefined }) => {
            const res = await axiosPrivate.get(`${BASE_URL}/api/communities/members`, {
                params: { communityid: communityId, cursor: pageParam },
            })
            return res.data
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage?.nextCursor,
        enabled: !!communityId,
    })

    const pages = data?.pages || []
    const members = pages.flatMap((p) => p?.data || [])

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {isFetching && members.length === 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton
                            key={idx}
                            variant='title'
                            style={{ height: 32, width: "100%", borderRadius: 6 }}
                        />
                    ))}
                </div>
            )}

            {members.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                    {members.map((m) => (
                        <div
                            key={m._id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 8px",
                                border: "1px solid #222",
                                borderRadius: 8,
                                background: "#1a1a1a",
                            }}
                        >
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: "#2a2a2a",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    flexShrink: 0,
                                    position: "relative",
                                }}
                            >
                                {m?.user?.profilePic ? (
                                    <>
                                        {!loadedImages[m._id] && (
                                            <Skeleton
                                                variant='card'
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: "50%",
                                                    position: "absolute",
                                                }}
                                            />
                                        )}
                                        <img
                                            src={`${BASE_URL}/uploads/profilePics/${m.user.profilePic}`}
                                            alt={m?.user?.username || "user"}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                opacity: loadedImages[m._id] ? 1 : 0,
                                                transition: "opacity 0.2s ease-in",
                                            }}
                                            onLoad={() =>
                                                setLoadedImages((prev) => ({
                                                    ...prev,
                                                    [m._id]: true,
                                                }))
                                            }
                                        />
                                    </>
                                ) : (
                                    <span style={{ color: "#bbb", fontWeight: 700 }}>
                                        {(m?.user?.username || "?").slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
                                    {m?.user?.username || "Unknown"}
                                </span>
                                <span style={{ color: "#888", fontSize: 12 }}>
                                    Joined {new Date(m?.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isFetching && members.length === 0 && (
                <div style={{ color: "#999", textAlign: "center", padding: "1rem" }}>
                    No members yet.
                </div>
            )}

            {isFetchingNextPage && (
                <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
                    <Spinner
                        withStyles={false}
                        size={28}
                    />
                </div>
            )}

            {hasNextPage && !isFetchingNextPage && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                        onClick={() => fetchNextPage()}
                        style={{
                            marginTop: 12,
                            padding: "10px 20px",
                            borderRadius: 8,
                            background: "#222",
                            color: "white",
                            border: "1px solid #333",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#000",
        color: "#fff",
    },
    header: {
        padding: "1rem 2rem",
        backgroundColor: "#111",
        borderBottom: "1px solid #333",
        position: "fixed",
        top: "60px",
        left: 0,
        right: 0,
        zIndex: 1,
    },
    title: {
        margin: 0,
        fontSize: "1.5rem",
        color: "#fff",
    },
    memberCount: {
        color: "#999",
        fontSize: "0.9rem",
        marginTop: "0.5rem",
    },
    messagesContainer: {
        flex: 1,
        overflowY: "auto",
        padding: "2rem",
        marginTop: "120px",
        marginBottom: "80px",
    },
    message: {
        backgroundColor: "#1a1a1a",
        padding: "1rem",
        borderRadius: "8px",
        marginBottom: "1rem",
        maxWidth: "70%",
    },
    ownMessage: {
        backgroundColor: "#ff444422",
        marginLeft: "auto",
    },
    messageHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.5rem",
    },
    userName: {
        fontWeight: "bold",
        color: "#ff4444",
    },
    timestamp: {
        color: "#666",
        fontSize: "0.8rem",
    },
    messageText: {
        color: "#fff",
        wordBreak: "break-word",
    },
    inputContainer: {
        padding: "1rem 2rem",
        backgroundColor: "#111",
        borderTop: "1px solid #333",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        gap: "1rem",
    },
    input: {
        flex: 1,
        padding: "0.75rem",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "1rem",
    },
    sendButton: {
        backgroundColor: "#ff4444",
        color: "#fff",
        border: "none",
        padding: "0.75rem 1.5rem",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "1rem",
        transition: "opacity 0.2s",
    },
    loadingContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#000",
    },
    loadingText: {
        color: "#fff",
        fontSize: "1.2rem",
    },
    errorContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#000",
    },
    errorText: {
        color: "#ff4444",
        fontSize: "1.2rem",
    },

    ////
    container: {
        fontFamily: "Arial, sans-serif",
        background: "black",
        color: "#e1e1e1",
        padding: "0 8px",
        maxWidth: "800px",
        margin: "100px auto",
    },
    header: {
        display: "flex",
        alignItems: "center",
        padding: "16px 0",
    },
    icon: {
        fontSize: "1.2rem",
        cursor: "pointer",
        marginRight: "12px",
    },
    headerTitle: {
        fontSize: "1.4rem",
        margin: 0,
    },
    postCard: {
        background: "#1a1a1a",
        padding: "16px",
        borderRadius: "4px",
        marginBottom: "16px",
        position: "relative",
    },
    postMetaTop: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        fontSize: "0.75rem",
        marginBottom: "8px",
    },
    author: {
        marginTop: 6,
        fontWeight: "600",
    },
    time: {},
    flair: { background: "#333", padding: "2px 4px", borderRadius: "2px" },
    nsfw: { background: "#d20", padding: "2px 4px", borderRadius: "2px", color: "#fff" },
    postTitle: {
        fontSize: "1.1rem",
        margin: "8px 0",
    },
    postDescription: {
        fontSize: "0.95rem",
        color: "#bdbdbd",
        margin: "6px 0 0 0",
        lineHeight: "1.45",
        whiteSpace: "normal",
        wordWrap: "break-word",
        overflowWrap: "anywhere",
        maxWidth: "100%",
    },
    postDescriptionCollapsed: {
        fontSize: "0.95rem",
        color: "#bdbdbd",
        margin: "6px 0 10px 0",
        lineHeight: "1.45",
        whiteSpace: "normal",
        wordWrap: "break-word",
        overflowWrap: "anywhere",
        maxWidth: "100%",
        display: "-webkit-box",
        WebkitLineClamp: 5,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        position: "relative",
    },
    showMoreBtn: {
        position: "absolute",
        right: 8,
        bottom: 4,
        background: "transparent",
        border: "none",
        color: "#bbb",
        cursor: "pointer",
        fontSize: 16,
    },
    showLessBtn: {
        display: "inline-block",
        background: "transparent",
        border: "none",
        color: "#9ec1ff",
        marginBottom: 12,
        cursor: "pointer",
        fontSize: 13,
    },
    postActions: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "0.9rem",
    },
    actionBtn: {
        background: "none",
        border: "none",
        color: "#e1e1e1",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "4px",
    },
    inputSection: {
        margin: "16px 0",
    },
    inputField: {
        width: "100%",
        padding: "12px",
        borderRadius: "20px",
        border: "1px solid #333",
        // background: "#1a1a1a",
        color: "#e1e1e1",
    },
    sortBar: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px",
        marginBottom: "16px",
    },
    sortSelect: {
        background: "#1a1a1a",
        border: "1px solid #333",
        color: "#e1e1e1",
        padding: "4px",
    },
    searchInput: {
        flex: 1,
        background: "#1a1a1a",
        border: "1px solid #333",
        color: "#e1e1e1",
        padding: "4px",
    },
    commentsSection: {},
    commentContainer: { marginBottom: "12px" },
    commentCard: {
        background: "#1a1a1a",
        padding: "12px",
        borderRadius: "4px",
    },
    commentHeader: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        fontSize: "0.75rem",
        marginBottom: "4px",
    },
    commentAuthor: { fontWeight: "bold" },
    commentTime: {},
    stickied: { color: "#46d160" },
    commentText: { fontSize: "0.9rem", margin: "0 0 4px 4px" },
    commentActions: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "0.8rem",
        marginTop: "4px",
    },
    repliesContainer: { marginLeft: "20px", marginTop: "8px" },
    //
    replyBoxFull: {
        position: "relative",
        margin: "24px 0",
    },
    textarea: {
        width: "100%",
        minHeight: "140px",
        padding: "12px",
        paddingTop: "144px", // adjust for max preview height (120px) + padding
        paddingBottom: "48px",
        borderRadius: "8px",
        border: "1px solid #333",
        background: "#1a1a1a",
        color: "#e1e1e1",
        resize: "none",
        overflowY: "hidden",
        boxSizing: "border-box",
    },
    imagePreviewInline: {
        position: "absolute",
        top: "12px",
        left: "12px",
        maxWidth: "150px", // limit preview width
        maxHeight: "175px", // limit preview height
        width: "auto",
        height: "auto",
        borderRadius: "4px",
        overflow: "hidden",
        zIndex: 2,
    },
    imagePreview: {
        width: "100%",
        height: "auto",
        objectFit: "contain",
        display: "block",
    },
    clearBtn: {
        position: "absolute",
        top: "4px",
        right: "4px",
        background: "rgba(0,0,0,0.5)",
        border: "none",
        borderRadius: "50%",
        padding: "2px",
        color: "#fff",
        cursor: "pointer",
        zIndex: 3,
    },
    attachIcon: {
        position: "absolute",
        bottom: "12px",
        left: "12px",
        color: "#888",
        cursor: "pointer",
        fontSize: "1rem",
        zIndex: 1,
    },
    hiddenFileInput: {
        display: "none",
    },
    replyButtonFull: {
        position: "absolute",
        bottom: "12px",
        right: "12px",
        padding: "6px 16px",
        background: "#0079d3",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        zIndex: 1,
    },
    videoPreview: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "4px",
    },
}

export default CommunityChat
