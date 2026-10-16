import { useState, useRef, useEffect } from "react"
import useComments from "../hooks/useComments"
import Comment from "./Comment"
import usePendingMutations from "../hooks/usePendingMutations"
import { Skeleton } from "./Skeleton"
import Spinner from "./Spinner"

const getStyles = () => ({
    repliesSection: {
        marginTop: "8px",
        marginLeft: "42px", // 30px (ProfilePic) + 12px (gap)
    },
    repliesButton: {
        background: "none",
        border: "none",
        color: "#666",
        fontSize: "12px",
        cursor: "pointer",
        padding: "4px 0",
        "&:hover": {
            color: "#fff",
        },
    },
    repliesList: {
        marginTop: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    viewMoreReplies: {
        background: "none",
        border: "none",
        color: "#666",
        fontSize: "12px",
        cursor: "pointer",
        padding: "8px 0",
        width: "100%",
        textAlign: "left",
        "&:hover": {
            color: "#fff",
        },
    },
})

const CommentReplies = ({ c, updateReply, pending, updatePending, postId, isMember, sortBy }) => {
    const [isViewingReplies, setIsViewingReplies] = useState(false)
    const { useCommentsReplyQuery } = useComments()
    const [repliesCollapseTime, setRepliesCollapseTime] = useState(new Date().toISOString())
    const topContainerRef = useRef(null)
    const {
        data: replies,
        hasNextPage,
        isFetching,
        fetchNextPage,
        isFetchingNextPage,
    } = useCommentsReplyQuery(c._id, isViewingReplies)
    const pendingNextPageFetch = pending.includes(JSON.stringify(["replyComments", c._id]))
    const isFetchingState = isFetching || pendingNextPageFetch
    const { isPendingMutations } = usePendingMutations(["comments", "create", c._id], true)

    const handleNextPageFetch = () => {
        if (pendingNextPageFetch) return

        if (isPendingMutations) updatePending(["replyComments", c._id])
        else if (!pendingNextPageFetch) fetchNextPage()
    }

    useEffect(() => {
        if (!isViewingReplies) setRepliesCollapseTime(new Date().toISOString())
    }, [isViewingReplies])

    useEffect(() => {
        if (isFetchingState) setIsViewingReplies(true)
    }, [isFetchingState])

    useEffect(() => {
        if (replies?.pages?.length > 1 || !replies?.pages?.length) return

        const firstPage = replies.pages.at(0)
        const firstComment = firstPage?.data?.at(-1)
        if (firstComment?.status && firstPage?.data?.length === 1 && c.replyCount <= 1)
            setIsViewingReplies(true)
    }, [replies, c.replyCount])

    return (
        <div style={{ marginTop: "14px" }}>
            <div ref={topContainerRef} />
            {replies?.pages?.map((page, pageIndex) => {
                return (
                    <div
                        style={{ width: "100%" }}
                        key={pageIndex}
                    >
                        {page.data.map((c) => {
                            if (
                                c.createdAt > repliesCollapseTime ||
                                ((isFetchingNextPage || pendingNextPageFetch) &&
                                    isViewingReplies) ||
                                (!isFetchingState && isViewingReplies)
                            ) {
                                return (
                                    <Comment
                                        updateReply={updateReply}
                                        updatePending={updatePending}
                                        c={c}
                                        key={c._id}
                                        postId={postId}
                                        isMember={isMember}
                                        sortBy={sortBy}
                                    />
                                )
                            }
                        })}
                    </div>
                )
            })}

            {!isViewingReplies && !isFetchingState && (
                <span
                    className='mx-2'
                    onClick={() => {
                        const earliestComment = replies?.pages?.[0]?.data?.at(-1)

                        if (earliestComment?.createdAt > repliesCollapseTime && hasNextPage)
                            handleNextPageFetch()
                        else setIsViewingReplies(true)
                    }}
                >
                    View replies
                </span>
            )}

            {!isFetchingState && !hasNextPage && isViewingReplies && (
                <span
                    className='mx-2'
                    onClick={() => setIsViewingReplies(false)}
                >
                    Hide replies
                </span>
            )}

            {!isFetchingState && isViewingReplies && hasNextPage && (
                <span
                    className='mx-2'
                    onClick={handleNextPageFetch}
                >
                    View More
                </span>
            )}

            {isFetchingState && isViewingReplies && (
                <Spinner
                    withStyles={false}
                    size={20}
                />
            )}
        </div>
    )
}

export default CommentReplies
