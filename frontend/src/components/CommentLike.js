import { useMutation, useQueryClient } from "@tanstack/react-query"
import React, { useState, useRef } from "react"
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import { useSelector } from "react-redux"
import { produce } from "immer"
import MiniPopup from "./MiniPopup"
import { useNavigate } from "react-router-dom"
import CommentLikesModal from "./CommentLikesModal"

const CommentLike = ({ comment, postId, isMember, buttonRef, onRequireLogin, sortBy }) => {
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()
    const userData = useSelector((state) => state.auth.userData)
    const navigate = useNavigate()
    const [showPopup, setShowPopup] = useState(false)
    const [showLikesModal, setShowLikesModal] = useState(false)
    const internalRef = useRef(null)
    const ref = buttonRef || internalRef

    const likeComment = useMutation({
        mutationFn: async (variables) => {
            const { commentId, value } = variables
            const response = await axiosPrivate.post(
                `${BASE_URL}/api/posts/comment/like/${commentId}`,
                {
                    value,
                }
            )
            return response.data
        },
        onMutate: async (variables) => {
            const { commentId, value } = variables
            const cacheKey = comment.replyTo
                ? ["replyComments", comment.replyTo]
                : ["comments", postId, sortBy]

            await queryClient.cancelQueries({ queryKey: cacheKey })
            const previousData = queryClient.getQueryData(cacheKey)

            // Update cache
            queryClient.setQueryData(cacheKey, (oldData) => {
                if (!oldData) return oldData
                return produce(oldData, (draft) => {
                    draft.pages.forEach((page) => {
                        page.data.forEach((c) => {
                            if (c._id === commentId) {
                                c.hasLiked = value
                                c.likeCount += value ? 1 : -1
                            }
                        })
                    })
                })
            })

            return { previousData }
        },
        onError: (err, variables, context) => {
            const cacheKey = comment.replyTo
                ? ["replyComments", comment.replyTo]
                : ["comments", postId, sortBy]
            if (context?.previousData) queryClient.setQueryData(cacheKey, context.previousData)
        },
    })

    const handleLike = (commentId, value) => {
        // If not authenticated or not a member, show popup (delegated to parent if onRequireLogin is provided)
        if (!userData || (typeof isMember === "boolean" && !isMember)) {
            if (onRequireLogin) {
                onRequireLogin(ref)
                return
            }
            setShowPopup(true)
            return
        }
        likeComment.mutate({ commentId, value })
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
        if (comment.likeCount > 0) {
            setShowLikesModal(true)
        }
    }

    return (
        <>
            <button
                ref={ref}
                style={styles.actionButton}
                onClick={() => handleLike(comment._id, !comment.hasLiked)}
                disabled={likeComment.isPending}
            >
                {comment.hasLiked ? (
                    <AiFillHeart
                        color='#ff4444'
                        size={14}
                    />
                ) : (
                    <AiOutlineHeart size={14} />
                )}
                {comment.likeCount > 0 && (
                    <span
                        style={styles.likeCount}
                        onClick={handleLikeCountClick}
                    >
                        {comment.likeCount}
                    </span>
                )}
            </button>
            {/* Only show internal popup if not delegated to parent */}
            {showPopup && !onRequireLogin && (
                <MiniPopup
                    message={
                        !userData
                            ? "Please login to like comments."
                            : "Join the community to like comments."
                    }
                    buttonText={!userData ? "Login" : "Close"}
                    onButtonClick={handlePopupButton}
                    onClose={() => setShowPopup(false)}
                    anchorRef={ref}
                />
            )}
            <CommentLikesModal
                isOpen={showLikesModal}
                onClose={() => setShowLikesModal(false)}
                commentId={comment._id}
            />
        </>
    )
}

const styles = {
    actionButton: {
        background: "none",
        border: "none",
        padding: "4px",
        cursor: "pointer",
        color: "#666",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "12px",
        transition: "color 0.2s",
        "&:hover": {
            color: "#fff",
        },
        "&:disabled": {
            opacity: 0.5,
            cursor: "not-allowed",
        },
    },
    likeCount: {
        color: "#666",
        fontSize: "12px",
        fontWeight: "500",
        cursor: "pointer",
        "&:hover": {
            color: "#fff",
        },
    },
}

export default CommentLike
