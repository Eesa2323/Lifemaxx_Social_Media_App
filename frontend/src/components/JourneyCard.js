import React, { useEffect, useState } from "react"
import dayjs from "dayjs"
import Modal from "@mui/material/Modal"
import ProfilePic from "./ProfilePic"
import { BASE_URL } from "../utils/config"
import journeyIcon from "../assets/imgs/journey-icon.png"

const JourneyCard = ({
    journey,
    onClick,
    showImage = true,
    showDate = true,
    showTags = true,
    layout = "default", // kept for compatibility
    profileTheme = false,
}) => {
    const [previewOpen, setPreviewOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768)
        check()
        window.addEventListener("resize", check)
        return () => window.removeEventListener("resize", check)
    }, [])

    const styles = {
        card: {
            display: "flex",
            flexDirection: "column",
            borderRadius: 16,
            backgroundColor: profileTheme ? "var(--surface)" : "#1c1c1c",
            border: profileTheme ? "1px solid var(--border)" : "1px solid #333",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
            minHeight: 120,
            width: "100%",
            cursor: onClick ? "pointer" : "default",
            transition: "transform 0.2s, border-color 0.2s",
            paddingLeft: 12,
            paddingRight: 12,
        },
        cardRow: {
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 16,
        },
        leftThumbCol: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 88,
            width: 88,
            paddingRight: 8,
            alignSelf: "center",
        },
        rightCol: {
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            paddingRight: 8,
        },
        userCol: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
            marginLeft: 12,
            marginTop: 5,
            flexShrink: 0,
            minWidth: 140,
            maxWidth: 240,
        },
        userHeaderRow: {
            display: "flex",
            gap: 8,
            marginTop: 10,
            maxWidth: "100%",
        },
        username: {
            color: profileTheme ? "var(--text)" : "#fff",
            fontSize: 14,
            fontWeight: 600,
            maxWidth: 180,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
        },
        description: {
            color: profileTheme ? "var(--text-secondary)" : "#aaa",
            fontSize: 14,
        },
        tagsContainer: {
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 12,
        },
        tag: {
            backgroundColor: profileTheme ? "var(--surface-strong)" : "#333",
            color: profileTheme ? "var(--text)" : "#fff",
            padding: "4px 8px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
        },
        cardFooter: {
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginTop: "auto",
        },
        date: {
            fontSize: 12,
            color: profileTheme ? "var(--text-muted)" : "#888",
            marginRight: 8,
            marginBottom: 4,
        },
        imageSquare: {
            width: 64,
            height: 64,
            objectFit: "cover",
            borderRadius: 10,
            cursor: "pointer",
        },
        imageWide: {
            width: 100,
            height: 100,
            objectFit: "cover",
            borderRadius: 10,
            cursor: "pointer",
        },
        previewWrapper: {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            outline: "none",
        },
        previewBox: {
            width: "min(90vw, 520px)",
            aspectRatio: "1 / 1",
            backgroundColor: "#000",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #333",
        },
        previewImg: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
        },
        journeyIconFallback: {
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#333",
            borderRadius: 10,
            fontSize: 32,
        },
    }

    const handleClick = () => {
        if (onClick) onClick(journey)
    }

    return (
        <>
            <div
                style={{
                    ...styles.card,
                    ...(isMobile
                        ? {
                              width: "100vw",
                              marginLeft: "calc(50% - 50vw)",
                              marginRight: "calc(50% - 50vw)",
                              borderRadius: 0,
                          }
                        : {}),
                }}
                onClick={handleClick}
            >
                <div style={styles.cardRow}>
                    {!isMobile && showImage && (
                        <div style={styles.leftThumbCol}>
                            {journey?.image && !imageError ? (
                                <img
                                    src={journey.image}
                                    alt={journey.title}
                                    style={styles.imageSquare}
                                    onError={() => setImageError(true)}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setPreviewOpen(true)
                                    }}
                                />
                            ) : (
                                <div style={styles.imageSquare}>
                                    <img
                                        src={journeyIcon}
                                        alt='Journey icon'
                                        style={styles.imageSquare}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div
                        style={{
                            ...styles.rightCol,
                            marginLeft: !isMobile && showImage && journey?.image ? 12 : 0,
                        }}
                    >
                        <h2
                            style={{
                                marginTop: 20,
                                color: profileTheme ? "var(--text)" : undefined,
                                fontSize: 18,
                                display: "-webkit-box",
                                WebkitLineClamp: 5,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                            }}
                            title={journey.title}
                        >
                            {journey.title}
                        </h2>
                        <p
                            style={{
                                ...styles.description,
                                display: "-webkit-box",
                                WebkitLineClamp: 5,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                            }}
                            title={journey.description}
                        >
                            {journey.description}
                        </p>
                        {isMobile && showImage && (
                            <>
                                {journey?.image && !imageError ? (
                                    <img
                                        src={journey.image}
                                        alt={journey.title}
                                        style={styles.imageWide}
                                        onError={() => setImageError(true)}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setPreviewOpen(true)
                                        }}
                                    />
                                ) : (
                                    <div style={styles.imageWide}>
                                        <img
                                            src={journeyIcon}
                                            alt='Journey icon'
                                            style={styles.imageWide}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                        {showTags && journey?.tags && journey.tags.length > 0 && (
                            <div style={styles.tagsContainer}>
                                {journey.tags.map((tag, tagIndex) => (
                                    <span
                                        key={tagIndex}
                                        style={styles.tag}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* User info column (top-right) */}
                    <div
                        style={{
                            ...styles.userCol,
                            maxWidth: isMobile ? 200 : styles.userCol.maxWidth,
                        }}
                    >
                        {(() => {
                            const user =
                                journey?.user ||
                                journey?.creator ||
                                journey?.author ||
                                journey?.owner
                            const username = user?.username || journey?.username || user?.name || ""
                            const profilePicFile =
                                user?.profilePic || user?.profile_picture || user?.avatar
                            const profilePicSrc = profilePicFile
                                ? `${BASE_URL}/uploads/profilePics/${profilePicFile}`
                                : undefined

                            return (
                                <div style={styles.userHeaderRow}>
                                    <div style={{ pointerEvents: "none" }}>
                                        <ProfilePic
                                            size={36}
                                            src={profilePicSrc}
                                            userData={user}
                                            showCreateStoryIcon={false}
                                            hasStory={false}
                                            showStoryIndicator={false}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            ...styles.username,
                                            marginTop: 7,
                                            maxWidth: isMobile ? 170 : 240,
                                        }}
                                        title={username}
                                    >
                                        {username}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
                {showDate && (
                    <div style={styles.cardFooter}>
                        <div style={styles.date}>
                            {dayjs(journey.createdAt).format("MMM D, YYYY")}
                        </div>
                    </div>
                )}
            </div>
            <Modal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
            >
                <div
                    style={styles.previewWrapper}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={styles.previewBox}>
                        <img
                            src={journey.image}
                            alt={journey.title}
                            style={styles.previewImg}
                        />
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default JourneyCard
