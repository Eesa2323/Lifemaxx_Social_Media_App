import React, { useState, useRef, useLayoutEffect } from "react"
import { getAdminMessageText, getSenderInfo } from "../utils/chatHelper"
import { useSelector } from "react-redux"
import { BASE_URL, SMALL_SCREEN_SIZE } from "../utils/config"
import { useNavigate } from "react-router-dom"
import { useContext } from "react"
import ChatContext from "../contexts/ChatContext"
import { BiPlay } from "react-icons/bi"
import { FaUsers } from "react-icons/fa"
import { AiFillHeart } from "react-icons/ai"
import ProfilePic from "./ProfilePic"
import { useMediaQuery } from "react-responsive"

const isImage = (filename) => {
    if (!filename) return false
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".jfif"]
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}

const isVideo = (filename) => {
    if (!filename) return false
    const videoExtensions = [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"]
    return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}

const isJourneyPostVideo = (url) => {
    if (!url) return false
    const videoExtensions = [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".ogg"]
    return videoExtensions.some((ext) => url.toLowerCase().endsWith(ext))
}

// Helper to safely build video URLs with proper encoding to prevent ORB errors
const buildSafeVideoUrl = (baseUrl, filePath, cacheBuster = null) => {
    if (!baseUrl || !filePath) return ""

    // Normalize base URL (remove trailing slash if present)
    const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

    // Add cache buster to prevent stale responses
    const cacheBustParam = cacheBuster ? `?v=${cacheBuster}` : `?v=${Date.now()}`

    return `${base}/uploads/messages/${filePath}${cacheBustParam}`
}

const MessageBubble = ({ m, selectedChat, updateReply, handleMessageContextMenu }) => {
    const userId = useSelector((state) => state.auth.userData._id)
    const isGroupChat = selectedChat?.privateChatKey === ""
    const senderData = getSenderInfo(m, !isGroupChat && selectedChat?.users)
    const isOwn = userId === senderData._id
    const navigate = useNavigate()
    const { setSelectedMessageId } = useContext(ChatContext)
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })
    // Remove local contextMenu state and logic
    const [imageError, setImageError] = useState(false)
    const [imageLightbox, setImageLightbox] = useState({ open: false, src: null, alt: "" })

    // Add video UI state (same as JourneyPost, no autoplay on scroll)
    const videoRef = useRef(null)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(true)
    const [showControls, setShowControls] = useState(false)

    const formattedAdminText = m.isAdmin && getAdminMessageText(m)

    const getFileType = () => {
        if (m.pendingFileData?.type) {
            return m.pendingFileData.type
        } else if (m.fileName) {
            if (isImage(m.fileName)) return "image"
            if (isVideo(m.fileName)) return "video"
        }

        return null
    }

    // const handleVideoPlay = () => {
    //     if (m.status === "sending" || !m.fileName || !isVideo(m.fileName)) return

    //     if (isVideoPlaying) {
    //         setIsVideoPlaying(false)
    //     } else {
    //         setIsVideoPlaying(true)
    //     }
    // }

    const renderJourneyPost = () => {
        if (m.journeyPost === undefined) return null
        const { journeyPost } = m

        // Check if journey post has required data
        const isJourneyAvailable = !!journeyPost?.creator && !!journeyPost?.url

        return (
            <div
                style={{
                    maxWidth: 220,
                    minWidth: 160,
                    border: "2px solid #555",
                    borderRadius: 8,
                    padding: 8,
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    cursor: isJourneyAvailable ? "pointer" : "default",
                }}
            >
                {/* Creator above image, left-aligned */}
                {isJourneyAvailable ? (
                    <>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                            {journeyPost.creator.profilePic && (
                                <img
                                    src={journeyPost.creator.profilePic}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        marginRight: 8,
                                        border: "1px solid #333",
                                    }}
                                />
                            )}
                            <span style={{ color: "#aaa", fontSize: 13 }}>
                                {journeyPost.creator.username}
                            </span>
                        </div>

                        {/* Media (Image or Video) */}
                        {isJourneyPostVideo(journeyPost.url) ? (
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 220,
                                    height: 180,
                                    backgroundColor: "#333",
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                }}
                            >
                                <BiPlay
                                    style={{
                                        fontSize: "32px",
                                        color: "#fff",
                                        opacity: 0.8,
                                    }}
                                />
                            </div>
                        ) : (
                            <img
                                src={`${BASE_URL}/${journeyPost.url}`}
                                alt='Journey'
                                style={{
                                    width: "100%",
                                    maxWidth: 220,
                                    maxHeight: 180,
                                    borderRadius: 10,
                                    objectFit: "cover",
                                    marginBottom: 8,
                                    display: "block",
                                }}
                            />
                        )}

                        {/* Caption below image, left-aligned */}
                        {journeyPost.caption && (
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "#ccc",
                                    marginTop: 2,
                                    lineHeight: 1.4,
                                    maxWidth: 220,
                                    maxHeight: 40,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textAlign: "left",
                                }}
                                title={journeyPost.caption}
                            >
                                {journeyPost.caption.length > 60
                                    ? journeyPost.caption.slice(0, 60) + "..."
                                    : journeyPost.caption}
                            </div>
                        )}
                    </>
                ) : (
                    <div
                        style={{
                            color: "#aaa",
                            fontSize: 14,
                            textAlign: "center",
                            padding: "20px 0",
                        }}
                    >
                        Journey post unavailable
                    </div>
                )}
            </div>
        )
    }

    const renderSharedCommunity = () => {
        if (m.sharedCommunity === undefined) return null
        const { sharedCommunity } = m

        // Check if community has required data
        const isCommunityAvailable = !!sharedCommunity?._id && !!sharedCommunity?.name

        return (
            <div
                style={{
                    maxWidth: 340,
                    minWidth: 240,
                    background: "#2a2a2a",
                    borderRadius: 10,
                    padding: 12,
                    border: "2px solid #555",
                    cursor: isCommunityAvailable ? "pointer" : "default",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
                onClick={
                    isCommunityAvailable
                        ? () => navigate(`/communities/${sharedCommunity._id}`)
                        : undefined
                }
            >
                {isCommunityAvailable ? (
                    <>
                        {/* Community header */}
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginRight: 8,
                                    flexShrink: 0,
                                }}
                            >
                                <FaUsers style={{ fontSize: 14, color: "#fff" }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        color: "#fff",
                                        fontSize: 14,
                                        fontWeight: 600,
                                        marginBottom: 2,
                                    }}
                                >
                                    {sharedCommunity.name}
                                </div>
                                <div
                                    style={{
                                        color: "#aaa",
                                        fontSize: 12,
                                    }}
                                >
                                    {sharedCommunity.memberCount} members
                                </div>
                            </div>
                        </div>

                        {/* Community description */}
                        {sharedCommunity.description && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#ccc",
                                    lineHeight: 1.4,
                                    maxHeight: 40,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                }}
                                title={sharedCommunity.description}
                            >
                                {sharedCommunity.description}
                            </div>
                        )}

                        {/* Category badge */}
                        {sharedCommunity.category && (
                            <div
                                style={{
                                    marginTop: 8,
                                    display: "inline-block",
                                    background: "#444",
                                    color: "#aaa",
                                    fontSize: 10,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    textTransform: "capitalize",
                                }}
                            >
                                {sharedCommunity.category}
                            </div>
                        )}
                    </>
                ) : (
                    <div
                        style={{
                            color: "#aaa",
                            fontSize: 14,
                            textAlign: "center",
                            padding: "20px 0",
                        }}
                    >
                        Community unavailable
                    </div>
                )}
            </div>
        )
    }

    const renderReply = () => {
        if (m.reply === undefined) return null

        const replyFileType = () => {
            if (m.reply.fileName) {
                if (isImage(m.reply.fileName)) return "image"
                if (isVideo(m.reply.fileName)) return "video"
            }
            return null
        }

        const replySenderData = getSenderInfo(m.reply, !isGroupChat && selectedChat?.users)
        const replyType = replyFileType()

        return (
            <div
                style={{
                    marginLeft: 20,
                    marginBottom: 8,
                    borderLeft: "3px solid #046bc5",
                    paddingLeft: 12,
                    maxWidth: 280,
                }}
            >
                {/* Reply sender info */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: 4, gap: 6 }}>
                    <ProfilePic
                        size={20}
                        src={
                            replySenderData?.profilePic
                                ? `${BASE_URL}/uploads/profilePics/${replySenderData?.profilePic}`
                                : null
                        }
                    />
                    <span style={{ fontSize: 12, color: "#aaa" }}>
                        {replySenderData.username || "User"}
                    </span>
                </div>

                {/* Reply content bubble */}
                <div
                    style={{
                        background: "#333",
                        color: "#ccc",
                        borderRadius: 12,
                        padding:
                            replyType === "image" || replyType === "video"
                                ? "0 0 6px 0"
                                : "8px 12px",
                        fontSize: 13,
                        lineHeight: 1.4,
                        border: "1px solid #444",
                        maxHeight: 120,
                        overflow: "hidden",
                    }}
                >
                    {/* Reply image */}
                    {replyType === "image" && (
                        <div
                            style={{
                                width: "100%",
                                borderRadius: "12px 12px 8px 8px",
                                overflow: "hidden",
                            }}
                        >
                            <img
                                src={`${BASE_URL}/uploads/messages/${m.reply.fileName}`}
                                alt='reply attachment'
                                onClick={() =>
                                    setImageLightbox({
                                        open: true,
                                        src: `${BASE_URL}/uploads/messages/${m.reply.fileName}`,
                                        alt: m.reply.messageText || "reply image",
                                    })
                                }
                                style={{
                                    width: isMobile ? "40vw" : "100%",
                                    display: "block",
                                    maxHeight: isMobile ? 120 : 80,
                                    borderRadius: 0,
                                    objectFit: "cover",
                                    marginBottom: m.reply.messageText ? 6 : 0,
                                    cursor: "pointer",
                                }}
                            />
                        </div>
                    )}

                    {/* Reply video */}
                    {replyType === "video" && (
                        <div
                            style={{
                                width: "100%",
                                borderRadius: "12px 12px 8px 8px",
                                overflow: "hidden",
                                position: "relative",
                            }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    height: 80,
                                    backgroundColor: "#000",
                                    borderRadius: 0,
                                    marginBottom: m.reply.messageText ? 6 : 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <BiPlay
                                    style={{
                                        fontSize: "24px",
                                        color: "#fff",
                                        opacity: 0.8,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Reply journey post */}
                    {m.reply.journeyPost && (
                        <div
                            style={{
                                maxWidth: 180,
                                minWidth: 120,
                                border: "1px solid #555",
                                borderRadius: 6,
                                padding: 6,
                                backgroundColor: "rgba(255, 255, 255, 0.01)",
                            }}
                        >
                            {m.reply.journeyPost.creator && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        marginBottom: 6,
                                    }}
                                >
                                    {m.reply.journeyPost.creator.profilePic && (
                                        <img
                                            src={m.reply.journeyPost.creator.profilePic}
                                            alt={m.reply.journeyPost.creator.username}
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderRadius: "50%",
                                                objectFit: "cover",
                                                marginRight: 6,
                                                border: "1px solid #444",
                                            }}
                                        />
                                    )}
                                    <span style={{ color: "#aaa", fontSize: 11 }}>
                                        {m.reply.journeyPost.creator.username}
                                    </span>
                                </div>
                            )}
                            {m.reply.journeyPost.url &&
                                (isJourneyPostVideo(m.reply.journeyPost.url) ? (
                                    <div
                                        style={{
                                            width: "100%",
                                            maxWidth: 180,
                                            height: 80,
                                            backgroundColor: "#444",
                                            borderRadius: 8,
                                            marginBottom: 6,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <BiPlay
                                            style={{
                                                fontSize: "20px",
                                                color: "#fff",
                                                opacity: 0.8,
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <img
                                        src={`${BASE_URL}${m.reply.journeyPost.url}`}
                                        alt='Journey'
                                        style={{
                                            width: "100%",
                                            maxWidth: 180,
                                            maxHeight: 80,
                                            borderRadius: 8,
                                            objectFit: "cover",
                                            marginBottom: 6,
                                            display: "block",
                                        }}
                                    />
                                ))}
                            {m.reply.journeyPost.caption && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#bbb",
                                        marginTop: 2,
                                        lineHeight: 1.3,
                                        maxWidth: 180,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                    title={m.reply.journeyPost.caption}
                                >
                                    {m.reply.journeyPost.caption.length > 40
                                        ? m.reply.journeyPost.caption.slice(0, 40) + "..."
                                        : m.reply.journeyPost.caption}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reply text */}
                    {!m.reply.journeyPost && m.reply.messageText && (
                        <span
                            style={{
                                paddingLeft: replyType ? "8px" : "0",
                                paddingRight: replyType ? "8px" : "0",
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "100%",
                            }}
                        >
                            {m.reply.messageText.length > 50
                                ? m.reply.messageText.slice(0, 50) + "..."
                                : m.reply.messageText}
                        </span>
                    )}
                </div>
            </div>
        )
    }

    const renderSharedStory = () => {
        const { sharedStory } = m
        if (sharedStory === undefined) return null

        // Determine if story is available
        const isStoryAvailable = !!sharedStory?.user && !!sharedStory?.mediaUrl && !imageError

        if (m._id === "68d6bb520806afbc8d47d76f") {
            console.log("HAYAY")
        }

        return (
            <div
                style={{
                    maxWidth: 340,
                    minWidth: 240,
                    background: "#2a2a2a",
                    borderRadius: 10,
                    padding: 12,
                    border: "2px solid #555",
                    cursor: isStoryAvailable ? "pointer" : "default",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
                onClick={
                    isStoryAvailable
                        ? () => navigate(`/stories/${sharedStory?.user?._id}`)
                        : undefined
                }
            >
                {/* Story header */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                        {sharedStory?.user && sharedStory?.createdAt && (
                            <>
                                <div style={{ display: "flex", marginTop: 5 }}>
                                    <ProfilePic
                                        size={30}
                                        src={`${BASE_URL}${sharedStory?.user?.profilePic}`}
                                    />
                                    <div
                                        style={{
                                            color: "#fff",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            margin: "5px 0 0 5px",
                                        }}
                                    >
                                        {sharedStory?.user?.username || "Story"}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        color: "#aaa",
                                        fontSize: 12,
                                        marginLeft: "3px",
                                        marginTop: "-5px",
                                        marginBottom: "5px",
                                    }}
                                >
                                    {new Date(sharedStory?.createdAt).toLocaleDateString()}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Story preview */}
                {/* Story preview - handle available and unavailable cases */}
                <div
                    style={{
                        width: "100%",
                        height: 150,
                        borderRadius: 8,
                        overflow: "hidden",
                        backgroundColor: "#000",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {!sharedStory?.mediaUrl || imageError ? (
                        <div style={{ color: "#aaa", fontSize: 14, textAlign: "center" }}>
                            Story unavailable
                        </div>
                    ) : sharedStory.mediaType === "image" ? (
                        <img
                            src={`${BASE_URL}${sharedStory.mediaUrl}`}
                            alt='Story preview'
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                backgroundColor: "#000",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <BiPlay
                                style={{
                                    fontSize: "24px",
                                    color: "#fff",
                                    opacity: 0.8,
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderSharedPost = () => {
        if (m.sharedPost === undefined) return null
        const { sharedPost } = m

        // Check if post has required data
        const isPostAvailable = !!sharedPost?._id && (!!sharedPost?.creator || !!sharedPost?.url)
        const isVideoContent = sharedPost?.url ? isJourneyPostVideo(sharedPost.url) : false

        return (
            <div
                style={{
                    maxWidth: 340,
                    minWidth: 240,
                    background: "#2a2a2a",
                    borderRadius: 10,
                    padding: 12,
                    border: "2px solid #555",
                    cursor: isPostAvailable ? "pointer" : "default",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
                onClick={isPostAvailable ? () => navigate(`/posts/${sharedPost._id}`) : undefined}
            >
                {isPostAvailable ? (
                    <>
                        {/* Post creator header */}
                        {sharedPost.creator && (
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        marginRight: 8,
                                        flexShrink: 0,
                                    }}
                                >
                                    <img
                                        src={
                                            sharedPost.creator?.profilePic
                                                ? `${BASE_URL}/uploads/profilePics/${sharedPost.creator.profilePic}`
                                                : "/default-avatar.png"
                                        }
                                        alt={sharedPost.creator?.username || "User"}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            color: "#fff",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            marginBottom: 2,
                                        }}
                                    >
                                        {sharedPost.creator?.username || "Unknown User"}
                                    </div>
                                    {sharedPost.createdAt && (
                                        <div
                                            style={{
                                                color: "#aaa",
                                                fontSize: 12,
                                            }}
                                        >
                                            {new Date(sharedPost.createdAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Post media preview */}
                        {sharedPost.url && (
                            <div
                                style={{
                                    width: "100%",
                                    height: 150,
                                    borderRadius: 8,
                                    overflow: "hidden",
                                    marginBottom: 8,
                                    backgroundColor: "#222",
                                    position: "relative",
                                }}
                            >
                                {isVideoContent ? (
                                    <>
                                        <div
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "#000",
                                            }}
                                        >
                                            <svg
                                                width='32'
                                                height='32'
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
                                    </>
                                ) : (
                                    <img
                                        src={`${BASE_URL}${sharedPost.url}`}
                                        alt='Post preview'
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        {/* Post caption */}
                        {sharedPost.caption && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#ccc",
                                    lineHeight: 1.4,
                                    maxHeight: 40,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                }}
                                title={sharedPost.caption}
                            >
                                {sharedPost.caption}
                            </div>
                        )}

                        {/* Like count */}
                        {sharedPost.likes && (
                            <div
                                style={{
                                    marginTop: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "#aaa",
                                    fontSize: 12,
                                }}
                            >
                                <AiFillHeart style={{ color: "#ff4444" }} />
                                {sharedPost.likes.length} likes
                            </div>
                        )}
                    </>
                ) : (
                    <div
                        style={{
                            color: "#aaa",
                            fontSize: 14,
                            textAlign: "center",
                            padding: "20px 0",
                        }}
                    >
                        Post unavailable
                    </div>
                )}
            </div>
        )
    }

    // Handler for clicking a journey post or shared story bubble
    const handleBubbleClick = () => {
        if (m.journeyPost && m.journeyPost._id) {
            navigate(`/posts/${m.journeyPost._id}`, { state: { post: m.journeyPost } })
        } else if (m.sharedStory && m.sharedStory.user?._id && m.sharedStory.mediaUrl) {
            navigate(`/stories/${m.sharedStory.user._id}`)
        } else if (m.sharedStory) {
            // Do nothing for unavailable stories
        } else if (m.sharedPost && m.sharedPost._id) {
            navigate(`/posts/${m.sharedPost._id}`)
        }
    }

    const fileType = getFileType()

    // Only render as admin message if it's an admin message and NOT a shared content
    // Check explicitly for sharedPost property first before other conditions
    if (m.sharedPost) {
        // This is a shared post message, render the normal message bubble
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isOwn ? "flex-end" : "flex-start",
                    marginBottom: 18,
                }}
                onContextMenu={(e) => {
                    if (m.status === "sending") return
                    e.preventDefault()
                    setSelectedMessageId(m._id)
                }}
            >
                {/* Reply above message */}
                {renderReply()}

                {/* Username above bubble */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 2,
                        marginLeft: isOwn ? 0 : 8,
                        marginRight: isOwn ? 8 : 0,
                        alignSelf: isOwn ? "flex-end" : "flex-start",
                        gap: 6,
                    }}
                >
                    <ProfilePic
                        style={{ marginTop: 8 }}
                        size={25}
                        src={
                            senderData?.profilePic
                                ? `${BASE_URL}/uploads/profilePics/${senderData?.profilePic}`
                                : null
                        }
                    />

                    <span
                        style={{
                            fontSize: 13,
                            marginBottom: 4,
                            color: "#aaa",
                        }}
                    >
                        {senderData.username || "User"}
                    </span>
                </div>

                {/* Bubble */}
                <div
                    style={{
                        color: "#fff",
                        maxWidth: 340,
                        maxHeight: 400,
                        padding: 0,
                        boxShadow: "none",
                        wordBreak: "break-word",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        position: "relative",
                        background: "transparent",
                        border: "none",
                        transition: "opacity 0.2s",
                        cursor: "pointer",
                    }}
                    onContextMenu={(e) => {
                        if (m.status === "sending") return
                        e.preventDefault()

                        handleMessageContextMenu(e, m)
                        // console.log("fired")
                        // setSelectedMessageId(m._id)
                    }}
                    onClick={() => navigate(`/posts/${m.sharedPost._id}`)}
                >
                    {/* Shared Post */}
                    {renderSharedPost()}
                </div>

                {m.status === "sending" && (
                    <span style={{ color: "grey", marginLeft: 5, fontSize: 12 }}>➡️</span>
                )}

                {m.status === "error" && (
                    <span style={{ color: "red", marginLeft: 5, fontSize: 12 }}>❗</span>
                )}
            </div>
        )
    }

    // Regular admin vs. normal message check for other message types
    // Always treat messages with sharedStory property as story messages even if incomplete/unavailable
    return m.isAdmin &&
        m.sharedCommunity === undefined &&
        m.journeyPost === undefined &&
        m.sharedStory === undefined ? (
        <div
            style={{
                ...styles.adminMessageContainer,
                maxWidth: isMobile ? 280 : 460,
            }}
        >
            <span
                style={{
                    ...styles.adminMessageText,
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "normal",
                    display: "block",
                    textAlign: "center",
                }}
                title={`${isOwn ? "You" : senderData.username} ${formattedAdminText}`}
            >
                {isOwn ? "You" : senderData.username} {formattedAdminText}
            </span>
        </div>
    ) : (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isOwn ? "flex-end" : "flex-start",
                marginBottom: 18,
            }}
        >
            {/* Reply above message */}
            {renderReply()}

            {/* Username above bubble */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 2,
                    marginLeft: isOwn ? 0 : 8,
                    marginRight: isOwn ? 8 : 0,
                    alignSelf: isOwn ? "flex-end" : "flex-start",
                    gap: 6,
                }}
            >
                <ProfilePic
                    style={{ marginTop: 8 }}
                    size={25}
                    src={
                        senderData?.profilePic
                            ? `${BASE_URL}/uploads/profilePics/${senderData?.profilePic}`
                            : null
                    }
                />

                <span
                    style={{
                        fontSize: 13,
                        marginBottom: 4,
                        color: "#aaa",
                    }}
                >
                    {senderData.username || "User"}
                </span>
            </div>

            {/* Bubble */}
            <div
                onContextMenu={(e) => {
                    if (m.status === "sending") return
                    e.preventDefault()

                    handleMessageContextMenu(e, m)
                    // console.log("fired")
                    // setSelectedMessageId(m._id)
                }}
                style={{
                    // Avoid blue flicker for media bubbles
                    background:
                        m.sharedCommunity ||
                        m.sharedPost ||
                        fileType === "image" ||
                        fileType === "video"
                            ? "transparent"
                            : isOwn
                            ? "#046bc5"
                            : "#222",
                    color: "#fff",
                    borderRadius: m.sharedCommunity || m.sharedPost ? 0 : 18,
                    borderTopRightRadius: m.sharedCommunity || m.sharedPost ? 0 : isOwn ? 4 : 18,
                    borderTopLeftRadius: m.sharedCommunity || m.sharedPost ? 0 : isOwn ? 18 : 4,
                    maxWidth: 340,
                    maxHeight: 400,
                    padding:
                        m.sharedCommunity || m.sharedPost
                            ? 0
                            : fileType === "image" || fileType === "video"
                            ? 0 // remove side gaps around media/text
                            : "10px 16px",
                    boxShadow:
                        m.sharedCommunity || m.sharedPost ? "none" : "0 2px 8px rgba(0,0,0,0.08)",
                    wordBreak: "break-word",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    position: "relative",
                    // Dark grey border for image/video regardless of isOwn
                    border:
                        m.sharedCommunity || m.sharedPost
                            ? "none"
                            : // Images always get dark border
                            fileType === "image"
                            ? "1.5px solid #333"
                            : // Video with accompanying text: no outer container border (border sits on the <video>)
                            fileType === "video" && m.messageText
                            ? "none"
                            : // Video without text: dark border on container
                            fileType === "video"
                            ? "1.5px solid #333"
                            : // Text-only messages: keep blue for own, dark for others
                            isOwn
                            ? "1.5px solid #046bc5"
                            : "1.5px solid #333",
                    transition: "background 0.2s",
                    cursor: m.journeyPost || m.sharedStory || m.sharedPost ? "pointer" : "default",
                }}
                onClick={
                    m.journeyPost || m.sharedStory || m.sharedPost ? handleBubbleClick : undefined
                }
            >
                {/* Image if present */}
                {/* image moved outside the bubble; if message has both text+image we'll render text in a bubble above the image */}

                {/* Video if present */}
                {fileType === "video" && (
                    <div
                        style={{
                            width: "100%",
                            minWidth: isMobile ? 160 : 240,
                            // For video-only messages (no text) apply the dark border to this wrapper
                            border:
                                fileType === "video" && !m.messageText
                                    ? "1.5px solid #333"
                                    : "none",
                            // When video-only, give the wrapper the full message rounding (as the container used to have)
                            borderRadius:
                                fileType === "video" && !m.messageText
                                    ? isOwn
                                        ? "18px 4px 18px 18px"
                                        : "4px 18px 18px 18px"
                                    : isOwn
                                    ? "18px 4px 0 0"
                                    : "18px 18px 0 0",
                            overflow: "hidden",
                            position: "relative",
                            backgroundColor: "transparent",
                        }}
                        onMouseEnter={() => isPlaying && setShowControls(true)}
                        onMouseLeave={() => setShowControls(false)}
                        onTouchStart={() => isPlaying && setShowControls((prev) => !prev)}
                    >
                        {/* If video message also has text, render the text bubble above the video (like images) */}
                        {m.messageText && (
                            <div
                                style={{
                                    background: isOwn ? "#046bc5" : "#222",
                                    color: "#fff",
                                    borderRadius: 18,
                                    maxWidth: isMobile ? "55vw" : 340,
                                    padding: "10px 16px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                    marginBottom: 6,
                                    wordBreak: "break-word",
                                    alignSelf: isOwn ? "flex-end" : "flex-start",
                                    display: "inline-block",
                                }}
                            >
                                <span style={{ fontSize: 15, lineHeight: 1.5 }}>
                                    {m.messageText}
                                </span>
                            </div>
                        )}

                        {m.messageText ? (
                            <div style={{ position: "relative" }}>
                                <video
                                    ref={videoRef}
                                    key={`${m._id || m.tempId || m.fileName || Math.random()}`}
                                    src={`${BASE_URL}/uploads/messages/${m.fileName}`}
                                    style={{
                                        width: "100%",
                                        display: "block",
                                        maxHeight: isMobile ? 140 : 180,
                                        // when message has text we want a normal (all-sides) radius on the video
                                        borderRadius: m.messageText ? 12 : 0,
                                        // when message has text the border sits on the video; otherwise wrapper handles it
                                        border: m.messageText ? "1.5px solid #333" : "none",
                                        marginBottom: 0,
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
                                />
                                {/* Custom controls while playing */}
                                {hasLoaded && isPlaying && showControls && (
                                    <>
                                        {/* Play/Pause */}
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
                                                const v = videoRef.current
                                                if (!v) return
                                                if (v.paused) v.play().catch(() => {})
                                                else v.pause()
                                            }}
                                            aria-label={isPlaying ? "Pause video" : "Play video"}
                                        >
                                            {isPlaying ? (
                                                <svg
                                                    width='16'
                                                    height='16'
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
                                                    width='16'
                                                    height='16'
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

                                        {/* Mute/Unmute */}
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
                                            onClick={() => setIsMuted((m) => !m)}
                                            aria-label={isMuted ? "Unmute video" : "Mute video"}
                                        >
                                            {isMuted ? (
                                                <svg
                                                    width='16'
                                                    height='16'
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
                                                    width='16'
                                                    height='16'
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
                                {/* Play overlay when paused */}
                                {hasLoaded && !isPlaying && (
                                    <button
                                        type='button'
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "100%",
                                            backgroundColor: "transparent",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            border: "none",
                                            padding: 0,
                                            margin: 0,
                                            cursor: "pointer",
                                            zIndex: 2,
                                            borderRadius: 12,
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
                        ) : (
                            <video
                                ref={videoRef}
                                key={`${m._id || m.tempId || m.fileName || Math.random()}`}
                                src={`${BASE_URL}/uploads/messages/${m.fileName}`}
                                style={{
                                    width: "100%",
                                    display: "block",
                                    maxHeight: isMobile ? 140 : 180,
                                    // when message has text we want a normal (all-sides) radius on the video
                                    borderRadius: m.messageText ? 12 : 0,
                                    // when message has text the border sits on the video; otherwise wrapper handles it
                                    border: m.messageText ? "1.5px solid #333" : "none",
                                    marginBottom: 0,
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
                            />
                        )}

                        {/* Custom controls while playing */}
                        {hasLoaded && isPlaying && showControls && !m.messageText && (
                            <>
                                {/* Play/Pause */}
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
                                        const v = videoRef.current
                                        if (!v) return
                                        if (v.paused) v.play().catch(() => {})
                                        else v.pause()
                                    }}
                                    aria-label={isPlaying ? "Pause video" : "Play video"}
                                >
                                    {isPlaying ? (
                                        <svg
                                            width='16'
                                            height='16'
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
                                            width='16'
                                            height='16'
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

                                {/* Mute/Unmute */}
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
                                    onClick={() => setIsMuted((m) => !m)}
                                    aria-label={isMuted ? "Unmute video" : "Mute video"}
                                >
                                    {isMuted ? (
                                        <svg
                                            width='16'
                                            height='16'
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
                                            width='16'
                                            height='16'
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
                        {/* Play overlay when paused */}
                        {hasLoaded && !isPlaying && !m.messageText && (
                            <button
                                type='button'
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                    backgroundColor: "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "none",
                                    padding: 0,
                                    margin: 0,
                                    cursor: "pointer",
                                    zIndex: 2,
                                    borderRadius:
                                        fileType === "video" && !m.messageText
                                            ? isOwn
                                                ? "18px 4px 18px 18px"
                                                : "4px 18px 18px 18px"
                                            : isOwn
                                            ? "18px 4px 0 0"
                                            : "18px 18px 0 0",
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
                )}

                {/* Message text (full width dark grey chip for image/video) */}
                {m.journeyPost === undefined &&
                    m.sharedCommunity === undefined &&
                    m.sharedStory === undefined &&
                    m.sharedPost === undefined &&
                    m.messageText &&
                    (fileType === "video" ? null : fileType === "image" ? null : (
                        <span
                            style={{
                                fontSize: 15,
                                lineHeight: 1.5,
                                paddingLeft: "12px",
                                paddingRight: "12px",
                            }}
                        >
                            {m.messageText}
                        </span>
                    ))}
                {renderJourneyPost()}
                {/* Shared Community */}
                {renderSharedCommunity()}
                {/* Shared Story */}
                {renderSharedStory()}
                {/* Shared Post */}
                {m.sharedPost && renderSharedPost()}
            </div>

            {m.status === "sending" && (
                <span style={{ color: "grey", marginLeft: 5, fontSize: 12 }}>➡️</span>
            )}

            {m.status === "error" && (
                <span style={{ color: "red", marginLeft: 5, fontSize: 12 }}>❗</span>
            )}

            {/* If this message contains an image, render the text bubble (if any) above the image, and show the image outside the bubble */}
            {fileType === "image" && (
                <>
                    {m.messageText && (
                        <div
                            style={{
                                background: isOwn ? "#046bc5" : "#222",
                                color: "#fff",
                                borderRadius: 18,
                                maxWidth: 340,
                                padding: "10px 16px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                marginTop: 6,
                                marginBottom: 8,
                                wordBreak: "break-word",
                                alignSelf: isOwn ? "flex-end" : "flex-start",
                            }}
                        >
                            <span style={{ fontSize: 15, lineHeight: 1.5 }}>{m.messageText}</span>
                        </div>
                    )}

                    <div
                        style={{
                            width: "auto",
                            maxWidth: isMobile ? "55vw" : 340,
                            minWidth: 210,
                            overflow: "hidden",
                            display: "block",
                            marginBottom: 6,
                            alignSelf: isOwn ? "flex-end" : "flex-start",
                        }}
                    >
                        <img
                            src={
                                m.pendingFileData?.tempImageUrl ||
                                `${BASE_URL}/uploads/messages/${m.fileName}`
                            }
                            alt='attachment'
                            onClick={() =>
                                setImageLightbox({
                                    open: true,
                                    src:
                                        m.pendingFileData?.tempImageUrl ||
                                        `${BASE_URL}/uploads/messages/${m.fileName}`,
                                    alt: m.messageText || "attachment",
                                })
                            }
                            style={{
                                width: "100%",
                                display: "block",
                                maxHeight: 200,
                                objectFit: "contain",
                                maxWidth: 400,
                                border: "1px solid var(--darkGrey)",
                                borderRadius: 20,
                                cursor: "pointer",
                            }}
                        />
                    </div>
                </>
            )}
            {imageLightbox.open && (
                <div
                    role='dialog'
                    aria-modal='true'
                    onClick={() => setImageLightbox({ open: false, src: null, alt: "" })}
                    style={{
                        position: "fixed",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.95)",
                        zIndex: 2000,
                        // no padding here so centering is exact on small screens
                    }}
                >
                    {/* Close button pinned to viewport top-right so it's not affected by centering */}
                    <button
                        type='button'
                        onClick={() => setImageLightbox({ open: false, src: null, alt: "" })}
                        aria-label='Close image'
                        style={{
                            position: "fixed",
                            top: 16,
                            right: 16,
                            background: "transparent",
                            border: "none",
                            color: "#fff",
                            fontSize: 28,
                            cursor: "pointer",
                            zIndex: 2001,
                            padding: 6,
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
                        }}
                    >
                        <img
                            src={imageLightbox.src}
                            alt={imageLightbox.alt || "image"}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                width: "auto",
                                height: "auto",
                                objectFit: "contain",
                                borderRadius: 8,
                                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                                display: "block",
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Remove local contextMenu and its overlay */}
        </div>
    )
}

const styles = {
    adminMessageContainer: {
        alignSelf: "center",
        marginBottom: 20,
        padding: "8px 16px",
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
    },
    adminMessageText: {
        color: "var(--test)",
        fontSize: 13,
        lineHeight: 1.4,
    },
}

export default MessageBubble
