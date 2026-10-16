import React, { useState, useEffect, useMemo, useCallback, Fragment, useRef } from "react"
import { useMediaQuery } from "react-responsive"
import { AiOutlineHeart, AiFillHeart, AiOutlineComment } from "react-icons/ai"
import { IoSendSharp } from "react-icons/io5"
import { useSelector } from "react-redux"
import {
    useMutation,
    useQuery,
    useQueryClient,
    useInfiniteQuery,
    InfiniteQueryObserver,
} from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import Modal from "./Modal"
import Button from "./Button"
import { v4 as uuidV4 } from "uuid"
import { produce } from "immer"
import usePendingMutations from "../hooks/usePendingMutations"
import ProfilePic from "./ProfilePic"
import useComments from "../hooks/useComments"
import Comment from "./Comment"
import MentionText from "./MentionText"
import useMentionAutocomplete from "../hooks/useMentionAutocomplete"
import MentionAutocomplete from "./MentionAutocomplete"

const getStyles = (isMobile) => ({
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#1a1a1a",
        minHeight: isMobile ? "100vh" : "500px",
        maxHeight: isMobile ? "100vh" : "600px",
        width: "100%",
        position: "relative",
    },
    header: {
        padding: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    headerUnderline: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "1px",
        backgroundColor: "#333",
        margin: 0,
        padding: 0,
        border: "none",
    },
    title: {
        color: "#fff",
        fontSize: "16px",
        fontWeight: "600",
        margin: 0,
    },
    commentsList: {
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "30px",
    },
    commentItem: {
        display: "flex",
        gap: "12px",
    },
    profilePic: {
        marginTop: "5px",
    },
    profileImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    commentContent: {
        flex: 1,
        position: "relative",
    },
    commentMainSection: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
    },
    commentTextSection: {
        flex: 1,
    },
    commentHeader: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "4px",
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    username: {
        color: "#fff",
        fontSize: "14px",
        fontWeight: "600",
    },
    timestamp: {
        color: "#666",
        fontSize: "12px",
    },
    commentText: {
        color: "#fff",
        fontSize: "14px",
        lineHeight: "1.4",
        margin: "4px 0",
    },
    commentActions: {
        marginTop: "8px",
    },
    actionButton: {
        background: "none",
        border: "none",
        color: "#666",
        fontSize: "12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        "&:hover": {
            color: "#fff",
        },
    },
    likeButton: {
        background: "none",
        border: "none",
        padding: "4px",
        color: "#666",
        fontSize: "12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "4px",
        "&:hover": {
            color: "#fff",
        },
    },
    footer: {
        borderTop: "1px solid #333",
        padding: "16px",
        backgroundColor: "#1a1a1a",
        position: "relative",
        bottom: 0,
        left: 0,
        right: 0,
    },
    commentForm: {
        display: "flex",
        gap: "12px",
        alignItems: "center",
        width: "100%",
    },
    commentInputWrapper: {
        flex: 1,
        minWidth: 0,
    },
    commentInput: {
        width: "100%",
        background: "none",
        border: "1px solid #333",
        borderRadius: "20px",
        color: "#fff",
        fontSize: "14px",
        padding: "8px 16px",
        margin: 0,
        boxSizing: "border-box",
        "&::placeholder": {
            color: "#666",
        },
        "&:focus": {
            outline: "none",
            borderColor: "#666",
        },
    },
    submitButton: {
        background: "none",
        border: "none",
        padding: "8px",
        color: "#0095f6",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "opacity 0.2s",
    },
    commentTrigger: {
        background: "none",
        border: "none",
        padding: "4px",
        color: "#fff",
        fontSize: "14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        transition: "opacity 0.2s",
        "&:hover": {
            opacity: 0.8,
        },
    },
    replyPreview: {
        borderTop: "1px solid #333",
        padding: "8px 16px",
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
    },
    replyPreviewContent: {
        flex: 1,
        minWidth: 0,
    },
    replyPreviewHeader: {
        color: "#666",
        fontSize: "12px",
        marginBottom: "4px",
    },
    replyPreviewText: {
        color: "#fff",
        fontSize: "13px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    closeReplyButton: {
        background: "none",
        border: "none",
        color: "#666",
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        "&:hover": {
            color: "#fff",
        },
    },
})

const PostComments = ({
    post,
    isOpen: isOpenProp,
    onClose,
    isMember = true,
    checkCommunity = false,
    sortBy = null,
    autoOpenComments = false,
}) => {
    const [comment, setComment] = useState("")
    const [isOpen, setIsOpen] = useState(autoOpenComments)

    // Update isOpen state when autoOpenComments prop changes
    useEffect(() => {
        setIsOpen(autoOpenComments)
    }, [autoOpenComments])

    // Reset modal state when post changes (for navigation between posts)
    useEffect(() => {
        setIsOpen(autoOpenComments)
    }, [post._id, autoOpenComments])
    const commentBtnRef = useRef(null)
    const [pendingNextPageFetches, setPendingNextPageFetches] = useState([])
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const [replyData, setReplyData] = useState(null)
    const styles = getStyles(isMobile)
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()
    const userData = useSelector((state) => state.auth.userData)
    const { isPendingMutations } = usePendingMutations(["comments"])
    const { useCommentsQuery, useCommentsReplyQuery } = useComments()
    const commentsQuery = useCommentsQuery(post?._id, !!post?._id, sortBy)
    const commentsReplyQuery = useCommentsReplyQuery(replyData?.replyTo || replyData?._id, false)
    const token = useSelector((state) => state.auth.token)

    // Mention autocomplete
    const {
        showMentionPopup,
        mentionSearchTerm,
        mentionPosition,
        inputRef,
        handleInputChange: handleMentionInputChange,
        handleMentionSelect,
        closeMentionPopup,
    } = useMentionAutocomplete((newValue) => setComment(newValue))

    // If isOpenProp is provided, use it as the modal open state
    const modalOpen = typeof isOpenProp === "boolean" ? isOpenProp : isOpen
    const handleOpen = () => {
        // Always allow opening the modal for viewing comments
        if (typeof isOpenProp === "boolean") return
        setIsOpen(true)
    }
    const handleClose = () => {
        if (typeof isOpenProp === "boolean") {
            if (onClose) onClose()
            return
        }
        setIsOpen(false)
    }

    const updatePending = (value) => {
        if (!value) setPendingNextPageFetches([])
        else {
            setPendingNextPageFetches((prev) => {
                const existing = prev.find((k) => k === JSON.stringify(value))
                console.log(existing)

                if (!existing) return [...prev, JSON.stringify(value)]
                else return prev
            })
        }
    }

    const addComment = useMutation({
        mutationKey: replyData
            ? ["comments", "create", replyData.replyTo || replyData._id]
            : ["comments", "create", post._id],
        mutationFn: async (variables) => {
            const { content, replyTo } = variables
            const response = await axiosPrivate.post(`${BASE_URL}/api/posts/comment/${post._id}`, {
                content,
                replyTo,
            })
            return response.data
        },
        onMutate: async (variables) => {
            const { content, replyTo } = variables
            const cacheKey = replyTo ? ["replyComments", replyTo] : ["comments", post._id, sortBy]

            const wasFetching = replyTo ? commentsReplyQuery.isFetching : commentsQuery.isFetching
            await queryClient.cancelQueries({ queryKey: cacheKey })

            if (wasFetching) updatePending(cacheKey)

            const tempCommentId = uuidV4()
            const creatorData = {
                _id: userData._id,
                username: userData.username,
                profilePic: userData.profilePic,
            }
            const pendingComment = {
                _id: tempCommentId,
                content: content,
                status: "sending",
                ...(replyTo && { replyTo }),
                post: post._id,
                likeCount: 0,
                hasLiked: false,
                creator: creatorData,
                createdAt: new Date().toISOString(),
            }

            const count = replyTo ? replyData?.replyCount : post.commentCount

            queryClient.setQueryData(cacheKey, (prevData) => {
                return produce(prevData, (draft) => {
                    if (!prevData) {
                        draft = {
                            pages: [
                                {
                                    data: [pendingComment],
                                    ...(count > 0 && {
                                        nextCursor: pendingComment.createdAt,
                                    }),
                                },
                            ],
                            pageParams: [undefined],
                        }
                        return draft
                    }

                    const page = draft.pages[0]
                    page.data.unshift(pendingComment)
                })
            })

            if (replyTo) {
                queryClient.setQueryData(["comments", post._id, sortBy], (prevData) => {
                    return produce(prevData, (draft) => {
                        if (!draft) return

                        const parentIndex = draft.pages.findIndex((page) =>
                            page.data.some((c) => c._id === replyTo)
                        )

                        if (parentIndex === -1) return

                        const parentComment = draft.pages[parentIndex].data.find(
                            (c) => c._id === replyTo
                        )
                        if (parentComment) parentComment.replyCount = parentComment.replyCount + 1
                    })
                })
            }

            setReplyData(null)
            setComment("")

            return {
                pendingComment,
                cacheKey,
                replyTo,
            }
        },
        onSuccess: (data, _, context) => {
            const { pendingComment, cacheKey, replyTo } = context
            const { comment } = data

            queryClient.setQueryData(cacheKey, (prevData) => {
                return produce(prevData, (draft) => {
                    const page = draft.pages[0]
                    const pendingIndex = page.data.findIndex((c) => c._id === pendingComment._id)
                    if (pendingIndex === -1) return

                    const data = { ...comment, creator: pendingComment.creator }
                    page.data[pendingIndex] = data
                })
            })

            // updatePostPropertyCount(post._id, postFeedPageIndex, "commentCount", 1)
        },
    })

    const likeComment = useMutation({
        mutationFn: async ({ commentId, value }) => {
            const response = await axiosPrivate.post(`${BASE_URL}/api/comments/like/${commentId}`, {
                value,
            })
            return response.data
        },
        onSuccess: (data, variables) => {
            // Update the infinite query cache for comments
            queryClient.setQueryData(["comments", post._id, sortBy], (old) => {
                if (!old) return old
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: page.data.map((comment) =>
                            comment._id === variables.commentId
                                ? {
                                      ...comment,
                                      hasLiked: variables.value,
                                      likeCount: variables.value
                                          ? comment.likeCount + 1
                                          : comment.likeCount - 1,
                                  }
                                : comment
                        ),
                    })),
                }
            })
        },
    })

    const handleReply = (value) => {
        setReplyData(value)
    }

    const handleCancelReply = () => {
        setReplyData(null)
    }

    const handleLike = (commentId, value) => {
        if (!userData) return
        likeComment.mutate({ commentId, value })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!comment.trim()) return

        // Check if user can comment (authenticated and member if community post)
        if (checkCommunity && (!token || !isMember)) {
            return
        }

        addComment.mutate({
            content: comment,
            replyTo: replyData?.replyTo || replyData?._id,
        })
    }

    const handleInputChange = (e) => {
        const value = e.target.value
        setComment(value)
        handleMentionInputChange(value, e)
    }

    useEffect(() => {
        const observers = []

        if (!isPendingMutations && pendingNextPageFetches.length) {
            pendingNextPageFetches.forEach((k) => {
                const cacheKey = JSON.parse(k)
                const query = queryClient.getQueryCache().find({ queryKey: cacheKey })

                const observer = new InfiniteQueryObserver(queryClient, {
                    ...query.options,
                    queryKey: cacheKey,
                })

                observers.push(observer)
                observer.fetchNextPage()
            })

            updatePending(null)
        }

        return () => {
            observers.forEach((observer) => observer.destroy())
        }
    }, [isPendingMutations, pendingNextPageFetches])

    return (
        <>
            <button
                ref={commentBtnRef}
                onClick={handleOpen}
                style={styles.commentTrigger}
            >
                <AiOutlineComment size={20} />
                <span>Comments ({post.commentCount || 0})</span>
            </button>

            <Modal
                isOpen={modalOpen}
                onClose={handleClose}
                fullScreen={isMobile}
            >
                <div style={styles.container}>
                    <div style={styles.header}>
                        <h2 style={styles.title}>Comments</h2>
                        <hr style={styles.headerUnderline} />
                    </div>

                    <div style={styles.commentsList}>
                        {commentsQuery.data?.pages && commentsQuery.data.pages.length > 0 ? (
                            commentsQuery.data.pages.map((page, pageIndex) => {
                                if (!page?.data) return null
                                return (
                                    <Fragment key={pageIndex}>
                                        {page.data.map((c) => {
                                            if (c.replyTo) return null

                                            return (
                                                <Comment
                                                    pending={pendingNextPageFetches}
                                                    updatePending={updatePending}
                                                    updateReply={handleReply}
                                                    c={c}
                                                    key={c._id}
                                                    postId={post._id}
                                                    isMember={isMember}
                                                    sortBy={sortBy}
                                                />
                                            )
                                        })}
                                    </Fragment>
                                )
                            })
                        ) : (
                            <div style={{ color: "#666", textAlign: "center", paddingTop: "20px" }}>
                                No comments yet
                            </div>
                        )}
                    </div>

                    <div style={styles.footer}>
                        {replyData && (
                            <div style={styles.replyPreview}>
                                <div style={styles.replyPreviewContent}>
                                    <div style={styles.replyPreviewHeader}>
                                        Replying to {replyData.creator.username}
                                    </div>
                                    <div style={styles.replyPreviewText}>{replyData.content}</div>
                                </div>
                                <button
                                    style={styles.closeReplyButton}
                                    onClick={handleCancelReply}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        {!token || (checkCommunity && !isMember) ? (
                            <div style={styles.commentForm}>
                                <div style={styles.commentInputWrapper}>
                                    <input
                                        type='text'
                                        placeholder={
                                            !token
                                                ? "Please login to comment..."
                                                : "Join the community to comment..."
                                        }
                                        value=''
                                        disabled
                                        style={{
                                            ...styles.commentInput,
                                            opacity: 0.5,
                                            cursor: "not-allowed",
                                        }}
                                    />
                                </div>
                                <button
                                    type='button'
                                    style={{
                                        ...styles.submitButton,
                                        opacity: 0.5,
                                        cursor: "not-allowed",
                                    }}
                                    disabled
                                >
                                    <IoSendSharp size={20} />
                                </button>
                            </div>
                        ) : (
                            <form
                                style={styles.commentForm}
                                onSubmit={handleSubmit}
                            >
                                <div style={styles.commentInputWrapper}>
                                    <div style={{ position: "relative" }}>
                                        <input
                                            ref={inputRef}
                                            type='text'
                                            placeholder={"Add a comment..."}
                                            value={comment}
                                            onChange={(e) => handleInputChange(e)}
                                            style={styles.commentInput}
                                        />
                                        <MentionAutocomplete
                                            isVisible={showMentionPopup}
                                            searchTerm={mentionSearchTerm}
                                            onSelectUser={handleMentionSelect}
                                            onClose={closeMentionPopup}
                                            position={mentionPosition}
                                            inputRef={inputRef}
                                        />
                                    </div>
                                </div>
                                <button
                                    type='submit'
                                    style={styles.submitButton}
                                    disabled={!comment.trim() || addComment.isPending}
                                >
                                    <IoSendSharp size={20} />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default PostComments
