import React, { memo, useMemo } from "react"
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai"
import ProfilePic from "./ProfilePic"
import CommentReplies from "./CommentReplies"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import useComments from "../hooks/useComments"
import { formatTimestamp } from "../utils/helper"
import MentionText from "./MentionText"
import CommentLike from "./CommentLike"
import ThreeDotsMenu from "./ThreeDotsMenu"
import { useSelector } from "react-redux"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import { updatePostCommentCount } from "../utils/postCommentCount"

const getStyles = () => ({
    commentContainer: {
        display: "flex",
        gap: "12px",
        width: "100%",
        position: "relative",
        marginBottom: "16px",
    },
    profilePicContainer: {
        width: "32px",
        height: "32px",
        marginTop: "4px",
    },
    contentContainer: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
    },
    commentHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    },
    textContent: {
        flex: 1,
        marginRight: "12px",
    },
    username: {
        fontWeight: "600",
        fontSize: "14px",
        color: "#fff",
        marginBottom: "4px",
        cursor: "pointer",
    },
    commentText: {
        fontSize: "14px",
        color: "#fff",
        marginBottom: "8px",
        wordBreak: "break-word",
    },
    actionButtons: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "4px",
    },
    likeButton: {
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#8e8e8e",
    },
    replySection: {
        marginTop: "4px",
        fontSize: "12px",
        color: "#8d8d8d",
        cursor: "pointer",
    },
})

const Comment = ({ c, updateReply, updatePending, pending, postId, isMember, sortBy }) => {
    const styles = useMemo(() => getStyles(), [])
    const date = formatTimestamp(c.createdAt)
    const displayCaption = c.content
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const userData = useSelector((state) => state.auth.userData)
    const axiosPrivate = useAxiosPrivate()

    // Delete comment mutation
    const deleteComment = useMutation({
        mutationFn: async () => {
            const response = await axiosPrivate.delete(`${BASE_URL}/api/posts/comment/${c._id}`)
            return response.data
        },
        onSuccess: async (data) => {
            await updatePostCommentCount(queryClient, postId, -(data.deletedCount ?? 1))
            // Invalidate queries to refresh the comments list
            const cacheKey = c.replyTo ? ["replyComments", c.replyTo] : ["comments", postId, sortBy]
            queryClient.invalidateQueries({ queryKey: cacheKey })
            queryClient.invalidateQueries({ queryKey: ["comments"] })
        },
        onError: (error) => {
            console.error("Error deleting comment:", error)
        },
    })

    // Handler for delete comment
    const handleDeleteComment = () => {
        deleteComment.mutate()
    }

    return (
        <div style={styles.commentContainer}>
            <div style={styles.profilePicContainer}>
                <ProfilePic
                    userData={c.creator}
                    story={c.creator.latestStory}
                    size={32}
                />
            </div>

            <div style={styles.contentContainer}>
                <div style={styles.commentHeader}>
                    <div style={styles.textContent}>
                        <div
                            style={styles.username}
                            onClick={() =>
                                navigate(`/profile/${c.creator.username}`, {
                                    state: {
                                        userProfileInfo: c.creator,
                                        isPartialProfileData: true,
                                    },
                                })
                            }
                        >
                            {c.creator.username}
                        </div>
                        <div style={styles.commentText}>
                            {Array.isArray(displayCaption) ? (
                                displayCaption.map((el) => <span key={uuidv4()}>{el}</span>)
                            ) : (
                                <MentionText text={displayCaption} />
                            )}
                        </div>
                    </div>

                    <div style={styles.actionButtons}>
                        <CommentLike
                            comment={c}
                            postId={postId}
                            isMember={isMember}
                            sortBy={sortBy}
                        />
                        <ThreeDotsMenu
                            onDelete={handleDeleteComment}
                            isCreator={userData?._id === c.creator?._id}
                            position='right'
                        />
                    </div>
                </div>

                <div style={styles.replySection}>
                    <span onClick={() => updateReply(c)}>Reply</span>

                    {c.replyCount > 0 && (
                        <CommentReplies
                            updatePending={updatePending}
                            updateReply={updateReply}
                            c={c}
                            pending={pending}
                            postId={postId}
                            isMember={isMember}
                            sortBy={sortBy}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default Comment
