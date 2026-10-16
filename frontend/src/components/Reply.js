import React from "react"
import { BiPlay } from "react-icons/bi"
import { BASE_URL } from "../utils/config"

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

const Reply = ({ reply, onCancel }) => {
    if (!reply) return null

    const renderFilePreview = () => {
        if (!reply.fileName) return null

        if (isImage(reply.fileName)) {
            return (
                <img
                    src={`${BASE_URL}/uploads/messages/${reply.fileName}`}
                    alt='Reply preview'
                    style={styles.filePreview}
                />
            )
        } else if (isVideo(reply.fileName)) {
            return (
                <div style={styles.videoPreview}>
                    <BiPlay style={styles.playIcon} />
                </div>
            )
        }
        return null
    }

    return (
        <div style={styles.replyBox}>
            <div style={styles.replyHeader}>
                <span style={styles.username}>{reply.sender?.username || "User"}</span>
                {onCancel && (
                    <span
                        style={styles.cancel}
                        onClick={onCancel}
                    >
                        &times;
                    </span>
                )}
            </div>
            <div style={styles.replyContent}>
                {renderFilePreview()}
                <div
                    style={styles.caption}
                    title={reply.messageText}
                >
                    {reply.messageText && reply.messageText.length > 60
                        ? reply.messageText.slice(0, 60) + "..."
                        : reply.messageText}
                </div>
            </div>
        </div>
    )
}

const styles = {
    replyBox: {
        width: "100%",
        height: 80,
        background: "#232323",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "8px 12px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
    },
    replyHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    username: {
        color: "#ff8800",
        fontWeight: 700,
        fontSize: 14,
        marginRight: 8,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    cancel: {
        color: "#aaa",
        fontWeight: 700,
        fontSize: 18,
        cursor: "pointer",
        marginLeft: 8,
        lineHeight: 1,
    },
    replyContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        height: 30,
        gap: 12,
    },
    caption: {
        color: "#fff",
        fontSize: 13,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        flex: 1,
    },
    filePreview: {
        width: 36,
        height: 36,
        borderRadius: 4,
        objectFit: "cover",
        flexShrink: 0,
        border: "1px solid #333",
        padding: 4,
    },
    videoPreview: {
        width: 36,
        height: 36,
        backgroundColor: "#000",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: "1px solid #333",
        padding: 4,
    },
    playIcon: {
        fontSize: "16px",
        color: "#fff",
    },
}

export default Reply
