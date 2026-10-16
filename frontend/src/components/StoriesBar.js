import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMediaQuery } from "react-responsive"
import { useSelector } from "react-redux"
import useStories from "../hooks/useStories"
import StoryModal from "./StoryModal"
import { FiPlus } from "react-icons/fi"
import { BASE_URL } from "../utils/config"
import ProfilePic from "./ProfilePic"

const StoriesBar = () => {
    const navigate = useNavigate()
    const { useFollowingStoriesQuery } = useStories()
    const { data: storiesData = [], isLoading, error } = useFollowingStoriesQuery()
    const [showStoryModal, setShowStoryModal] = useState(false)
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const token = useSelector((state) => state.auth.token)
    const userData = useSelector((state) => state.auth.userData)

    const handleStoryClick = (userId) => {
        navigate(`/stories/${userId}`)
    }

    const handleCreateStory = () => {
        setShowStoryModal(true)
    }

    useEffect(() => {
        console.log("SHOWING STORIES BAR")
    }, [storiesData])

    const styles = {
        container: {
            padding: isMobile ? "1rem" : "1.5rem",
            backgroundColor: "#000",
            marginBottom: "1rem",
        },
        scrollContainer: {
            display: "flex",
            gap: "1rem",
            overflowX: "auto",
            paddingBottom: "0.5rem",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
        },
        storyItem: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: "70px",
            cursor: "pointer",
            transition: "transform 0.2s",
        },
        storyAvatar: {
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "3px solid #1da1f2",
            padding: "2px",
            marginBottom: "0.5rem",
            position: "relative",
            background:
                "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
        },
        viewedStoryAvatar: {
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "3px solid #c7c7c7",
            padding: "2px",
            marginBottom: "0.5rem",
            position: "relative",
        },
        createStoryAvatar: {
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#1da1f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.5rem",
            cursor: "pointer",
            transition: "transform 0.2s",
        },
        avatarImage: {
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
        },
        storyUsername: {
            fontSize: "12px",
            color: "#fff",
            textAlign: "center",
            maxWidth: "70px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        },
        loadingContainer: {
            display: "flex",
            gap: "1rem",
            overflowX: "auto",
        },
        skeletonStory: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: "70px",
        },
        skeletonAvatar: {
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#333",
            marginBottom: "0.5rem",
            animation: "pulse 1.5s ease-in-out infinite",
        },
        skeletonText: {
            width: "50px",
            height: "12px",
            backgroundColor: "#333",
            borderRadius: "6px",
            animation: "pulse 1.5s ease-in-out infinite",
        },
    }

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    {[...Array(5)].map((_, index) => (
                        <div
                            key={index}
                            style={styles.skeletonStory}
                        >
                            <div style={styles.skeletonAvatar} />
                            <div style={styles.skeletonText} />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return null
    }

    // Check if all stories are viewed
    const hasUnviewedStories = (userStories) => {
        return userStories.stories.some((story) => !story.isViewed)
    }

    return (
        <>
            <div style={styles.container}>
                <div style={styles.scrollContainer}>
                    {/* Own Story - Create Story */}
                    {token && userData && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "0.3rem",
                            }}
                        >
                            <ProfilePic
                                size={50}
                                userData={userData}
                                src={
                                    userData.profilePic
                                        ? `${BASE_URL}/uploads/profilePics/${userData.profilePic}`
                                        : null
                                }
                                showCreateStoryIcon={true}
                                isOwn={true}
                            />
                        </div>
                    )}

                    {/* User Stories */}
                    {storiesData.map((userStories) => {
                        const userDetails = userStories.user
                        const lastStory = userStories?.stories?.at(-1) // Get the first story for preview

                        return (
                            <div
                                key={userDetails._id}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                }}
                            >
                                <ProfilePic
                                    latestStory={lastStory}
                                    size={50}
                                    userData={userDetails}
                                />
                                <span style={{ fontSize: 13, fontWeight: "bold", color: "#fff" }}>
                                    {userDetails.username}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
            {/* 
            <style jsx>{`
                @keyframes pulse {
                    0%,
                    100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }

                .scrollContainer::-webkit-scrollbar {
                    display: none;
                }
            `}</style> */}
        </>
    )
}

export default StoriesBar
