import React, { useEffect } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import JourneyPost from "../components/JourneyPost"
import { BASE_URL } from "../utils/config"
import useAxiosPrivate from "../hooks/useAxiosPrivate"

const PostPage = () => {
    const { id } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const axiosPrivate = useAxiosPrivate()

    // Check if we came from a notification (mention) using React Router state
    const fromNotification = location.state?.fromNotification
    const openComments = location.state?.openComments
    const sortBy = fromNotification ? "mentions" : null

    const {
        data: post,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["post", id],
        queryFn: async () => {
            const res = await axiosPrivate.get(`${BASE_URL}/api/posts/post/${id}`)
            return res.data?.post
        },
        enabled: !!id,
    })

    useEffect(() => {
        // Clear the state to prevent auto-opening comments when navigating between posts
        if (location.state?.fromNotification && !openComments) {
            navigate(location.pathname, { replace: true, state: {} })
        }
    }, [id, location.state, openComments, navigate])

    if (isLoading)
        return <div style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>Loading...</div>
    if (isError)
        return (
            <div style={{ color: "#ff6b6b", textAlign: "center", marginTop: 40 }}>
                {error.message}
            </div>
        )
    if (!post)
        return (
            <div style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>Post not found</div>
        )

    const handleNavigateToSource = () => {
        if (post.community) {
            navigate(`/communities/${post.community}`)
        } else if (post.journey) {
            navigate(`/journeys/${post.journey}`)
        }
    }

    // Clear React Router state when navigating to a different post

    return (
        <div
            className='page-wrapper post-page'
            style={{ alignItems: "center", marginTop: 32 }}
        >
            {/* Navigation button */}
            {(post.community || post.journey) && (
                <div style={{ marginBottom: 16, width: "100%", maxWidth: 600 }}>
                    <button
                        onClick={handleNavigateToSource}
                        style={{
                            background: "var(--primary)",
                            color: "#fff",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                        }}
                    >
                        Go to {post.community ? "Community" : "Journey"}
                    </button>
                </div>
            )}

            <JourneyPost
                post={post}
                autoOpenComments={openComments}
            />
        </div>
    )
}

export default PostPage
