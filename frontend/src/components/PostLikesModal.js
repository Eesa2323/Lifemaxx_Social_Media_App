import React, { useState, useEffect } from "react"
import { useMediaQuery } from "react-responsive"
import { useInfiniteQuery } from "@tanstack/react-query"
import axios from "axios"
import { BASE_URL } from "../utils/config"
import Modal from "./Modal"
import ProfilePic from "./ProfilePic"
import { useNavigate } from "react-router-dom"
import Spinner from "./Spinner"
import Skeleton from "./Skeleton"

const getStyles = (isMobile) => ({
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#1a1a1a",
        minHeight: isMobile ? "100vh" : "400px",
        maxHeight: isMobile ? "100vh" : "500px",
        width: "100%",
        position: "relative",
    },
    header: {
        padding: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderBottom: "1px solid #333",
    },
    title: {
        color: "#fff",
        fontSize: "16px",
        fontWeight: "600",
        margin: 0,
    },
    likesList: {
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    likeItem: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 0",
    },
    profilePicContainer: {
        width: "40px",
        height: "40px",
        flexShrink: 0,
    },
    userInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
    },
    username: {
        color: "#fff",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        "&:hover": {
            opacity: 0.8,
        },
    },
    loadMoreContainer: {
        padding: "16px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        borderTop: "1px solid #333",
    },
    loadMoreButton: {
        background: "none",
        border: "1px solid #333",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px",
        "&:hover": {
            backgroundColor: "#333",
        },
        "&:disabled": {
            opacity: 0.5,
            cursor: "not-allowed",
        },
    },
    emptyState: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        fontSize: "14px",
    },
    loadingContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
    },
})

const PostLikesModal = ({ isOpen, onClose, postId }) => {
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const styles = getStyles(isMobile)
    const navigate = useNavigate()

    const {
        data: likesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ["postLikes", postId],
        queryFn: async ({ pageParam }) => {
            const url = `${BASE_URL}/api/posts/likes/${postId}${
                pageParam ? `?cursor=${pageParam}` : ""
            }`
            const response = await axios.get(url)
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: isOpen && !!postId,
    })

    const handleUserClick = (user) => {
        navigate(`/profile/${user.username}`, {
            state: {
                userProfileInfo: user,
                isPartialProfileData: true,
            },
        })
        onClose()
    }

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }

    if (!isOpen) return null

    const allLikes = likesData?.pages?.flatMap((page) => page.data) || []

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            fullScreen={isMobile}
        >
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Likes</h2>
                </div>

                <div style={styles.likesList}>
                    {isLoading ? (
                        // Show skeleton rows while loading
                        Array.from({ length: 8 }).map((_, index) => (
                            <div
                                key={index}
                                style={styles.likeItem}
                            >
                                <div style={styles.profilePicContainer}>
                                    <Skeleton
                                        width={40}
                                        height={40}
                                        borderRadius='50%'
                                    />
                                </div>
                                <div style={styles.userInfo}>
                                    <Skeleton
                                        width={120}
                                        height={16}
                                        borderRadius='4px'
                                    />
                                </div>
                            </div>
                        ))
                    ) : isError ? (
                        <div style={styles.emptyState}>Failed to load likes</div>
                    ) : allLikes.length === 0 ? (
                        <div style={styles.emptyState}>No likes yet</div>
                    ) : (
                        allLikes.map((like) => (
                            <div
                                key={like._id}
                                style={styles.likeItem}
                            >
                                <div style={styles.profilePicContainer}>
                                    <ProfilePic
                                        userData={like.liker}
                                        size={40}
                                    />
                                </div>
                                <div style={styles.userInfo}>
                                    <div
                                        style={styles.username}
                                        onClick={() => handleUserClick(like.liker)}
                                    >
                                        {like.liker.username}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {hasNextPage && (
                    <div style={styles.loadMoreContainer}>
                        <button
                            style={styles.loadMoreButton}
                            onClick={handleLoadMore}
                            disabled={isFetchingNextPage}
                        >
                            {isFetchingNextPage ? (
                                <Spinner
                                    size={16}
                                    withStyles={false}
                                />
                            ) : (
                                "Load More"
                            )}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    )
}

export default PostLikesModal
