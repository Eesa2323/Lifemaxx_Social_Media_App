import { useMutation, useQueryClient } from "@tanstack/react-query"
import React, { useState, useRef } from "react"
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import { useSelector } from "react-redux"
import { produce } from "immer"
import MiniPopup from "./MiniPopup"
import { useNavigate } from "react-router-dom"
import PostLikesModal from "./PostLikesModal"

const Like = ({ post, cacheKey, isMember, buttonRef, onRequireLogin }) => {
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()
    const userData = useSelector((state) => state.auth.userData)
    const navigate = useNavigate()
    const [showPopup, setShowPopup] = useState(false)
    const [showLikesModal, setShowLikesModal] = useState(false)
    const internalRef = useRef(null)
    const ref = buttonRef || internalRef

    const likePost = useMutation({
        mutationFn: async (variables) => {
            const { postId, value } = variables
            const response = await axiosPrivate.post(`${BASE_URL}/api/posts/like/${postId}`, {
                value,
            })
            return response.data
        },
        onMutate: async (variables) => {
            const { postId, value } = variables

            await queryClient.cancelQueries({ queryKey: cacheKey })
            await queryClient.cancelQueries({ queryKey: ["post", postId] })
            const previousData = queryClient.getQueryData(cacheKey)
            const previousSingle = queryClient.getQueryData(["post", postId])

            // Update feed cache
            queryClient.setQueryData(cacheKey, (oldData) => {
                if (!oldData) return oldData
                return produce(oldData, (draft) => {
                    draft.pages.forEach((page) => {
                        page.data.forEach((post) => {
                            if (post._id === postId) {
                                post.hasLiked = value
                                post.likeCount += value ? 1 : -1
                            }
                        })
                    })
                })
            })

            // Update single post cache
            queryClient.setQueryData(["post", postId], (oldPost) => {
                if (!oldPost) return oldPost
                return {
                    ...oldPost,
                    hasLiked: value,
                    likeCount: oldPost.likeCount + (value ? 1 : -1),
                }
            })

            return { previousData, previousSingle }
        },
        onError: (err, variables, context) => {
            if (context?.previousData) queryClient.setQueryData(cacheKey, context.previousData)
            if (context?.previousSingle)
                queryClient.setQueryData(["post", variables.postId], context.previousSingle)
        },
    })

    const handleLike = (postId, value) => {
        // If not authenticated or not a member, show popup (delegated to parent if onRequireLogin is provided)
        if (!userData || (typeof isMember === "boolean" && !isMember)) {
            if (onRequireLogin) {
                onRequireLogin(ref)
                return
            }
            setShowPopup(true)
            return
        }
        likePost.mutate({ postId, value })
    }

    const handlePopupButton = () => {
        setShowPopup(false)
        if (!userData) {
            navigate("/login")
        } else if (typeof isMember === "boolean" && !isMember) {
            // Optionally, navigate to community page or trigger join logic
            // For now, just close popup
        }
    }

    const handleLikeCountClick = (e) => {
        e.stopPropagation()
        if (post.likeCount > 0) {
            setShowLikesModal(true)
        }
    }

    return (
        <>
            <div style={styles.likeContainer}>
                <button
                    ref={ref}
                    style={styles.actionButton}
                    onClick={() => handleLike(post._id, !post.hasLiked)}
                    disabled={likePost.isPending}
                >
                    {post.hasLiked ? (
                        <AiFillHeart
                            color='#ff4444'
                            size={20}
                        />
                    ) : (
                        <AiOutlineHeart size={20} />
                    )}
                </button>
                {post.likeCount > 0 && (
                    <span
                        style={styles.likeCount}
                        onClick={handleLikeCountClick}
                    >
                        {post.likeCount}
                    </span>
                )}
            </div>
            {/* Only show internal popup if not delegated to parent */}
            {showPopup && !onRequireLogin && (
                <MiniPopup
                    message={
                        !userData
                            ? "Please login to like posts."
                            : "Join the community to like posts."
                    }
                    buttonText={!userData ? "Login" : "Close"}
                    onButtonClick={handlePopupButton}
                    onClose={() => setShowPopup(false)}
                    anchorRef={ref}
                />
            )}
            <PostLikesModal
                isOpen={showLikesModal}
                onClose={() => setShowLikesModal(false)}
                postId={post._id}
            />
        </>
    )
}

const styles = {
    likeContainer: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    actionButton: {
        background: "none",
        border: "none",
        padding: "0.5rem",
        cursor: "pointer",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
        "&:disabled": {
            opacity: 0.5,
            cursor: "not-allowed",
        },
    },
    likeCount: {
        color: "#999",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        "&:hover": {
            color: "#fff",
        },
    },
}

export default Like
