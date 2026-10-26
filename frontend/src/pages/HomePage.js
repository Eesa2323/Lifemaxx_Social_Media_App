import React, { useState, useRef, useCallback, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useMediaQuery } from "react-responsive"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useSelector } from "react-redux"

import JourneyPost from "../components/JourneyPost"

import { PostFeedMuteProvider } from "../contexts/PostFeedMuteContext"
import axios from "../utils/axios"

const HomePage = () => {
    const location = useLocation()
    const isNewSignup = location.state?.isNewSignup || false

    const isMobile = useMediaQuery({ maxWidth: 768 })

    const token = useSelector((state) => state.auth.token)

    const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null)
    const [inViewMap, setInViewMap] = useState({})
    const [latestUsers, setLatestUsers] = useState([])

    useEffect(() => {
        const fetchLatestUsers = async () => {
            try {
                const res = await axios.get("/api/users/latest", {
                    headers: token ? { "x-auth-token": token } : {},
                })
                setLatestUsers(res.data || [])
            } catch (err) {
                setLatestUsers([])
            }
        }
        fetchLatestUsers()
    }, [token])

    const containerRefs = useRef([])
    const intersectionRatiosRef = useRef({})
    const debounceTimeoutRef = useRef(null)
    const lastMaxIdRef = useRef(null)

    // Fetch feed
    const fetchFeed = async ({ pageParam = null }) => {
        const res = await axios.get("/api/posts/feed", {
            params: { cursor: pageParam },
            headers: { "x-auth-token": token },
        })
        return res.data
    }

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isLoading } =
        useInfiniteQuery({
            queryKey: ["feed"],
            queryFn: fetchFeed,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 1000 * 60 * 5,
        })

    const loadedPosts =
        data?.pages?.reduce((total, page) => total + (page.data?.length || 0), 0) || 0

    // Infinite scroll
    const observer = useRef()

    const lastPageRef = useCallback(
        (node) => {
            if (isFetchingNextPage || isLoading || status === "pending") return
            if (observer.current) observer.current.disconnect()

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            })

            if (node) observer.current.observe(node)
        },
        [isFetchingNextPage, isLoading, status, fetchNextPage, hasNextPage],
    )

    // Video autoplay logic
    useEffect(() => {
        if (!data?.pages) return

        intersectionRatiosRef.current = {}

        const observer = new IntersectionObserver(
            (entries) => {
                const newMap = { ...inViewMap }

                entries.forEach((entry) => {
                    const id = entry.target.dataset.postid
                    intersectionRatiosRef.current[id] = entry.intersectionRatio
                    newMap[id] = entry.isIntersecting
                })

                setInViewMap(newMap)

                let maxRatio = 0
                let maxId = null

                Object.entries(intersectionRatiosRef.current).forEach(([id, ratio]) => {
                    if (ratio > maxRatio) {
                        maxRatio = ratio
                        maxId = id
                    }
                })

                const lastId = lastMaxIdRef.current
                const lastRatio = intersectionRatiosRef.current[lastId] || 0

                if (!lastId || (maxId !== lastId && maxRatio > lastRatio + 0.1)) {
                    if (debounceTimeoutRef.current) {
                        clearTimeout(debounceTimeoutRef.current)
                    }

                    debounceTimeoutRef.current = setTimeout(() => {
                        setCurrentlyPlayingId(maxId)
                        lastMaxIdRef.current = maxId
                    }, 100)
                }
            },
            { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
        )

        containerRefs.current.forEach((ref) => ref && observer.observe(ref))

        return () => {
            observer.disconnect()
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [data])

    // Update profile
    const SkeletonPost = () => (
        <div style={{ padding: 16, color: "#666", textAlign: "center" }}>Loading...</div>
    )

    const Spinner = () => <div style={{ textAlign: "center", padding: 12 }}>Loading more...</div>

    return (
        <div className='page-wrapper home-page'>
            <div className='home-page-top'>
            </div>

            <div className='home-grid'>
                <main className='home-left'>
                    <PostFeedMuteProvider>
                        <div className='feed-column'>
                            {(isLoading || status === "pending") && (
                                <>
                                    <SkeletonPost />
                                    <SkeletonPost />
                                    <SkeletonPost />
                                </>
                            )}

                            {!isLoading &&
                                status !== "pending" &&
                                data?.pages.map((page, i) =>
                                    page.data.map((post, j) => {
                                        const isLast =
                                            i === data.pages.length - 1 &&
                                            j === page.data.length - 1

                                        const refCallback = (el) => {
                                            containerRefs.current[i * 1000 + j] = el
                                        }

                                        return (
                                            <div
                                                className='post-card-wrapper'
                                                key={post._id}
                                                ref={isLast ? lastPageRef : null}
                                                data-postid={post._id}
                                            >
                                                <JourneyPost
                                                    post={post}
                                                    cacheKey={["feed"]}
                                                    shouldPlay={currentlyPlayingId === post._id}
                                                    isInView={!!inViewMap[post._id]}
                                                    postContainerRef={refCallback}
                                                />
                                            </div>
                                        )
                                    }),
                                )}

                            {isFetchingNextPage && <Spinner />}
                        </div>
                    </PostFeedMuteProvider>
                </main>
                {!isMobile && (
                    <aside className='home-aside'>
                        <div className='home-trending-card' style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                            <div className='home-trending-header' style={{ fontWeight: 600, marginBottom: '10px' }}>Latest users</div>
                            <div className='home-trending-list' style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {latestUsers.map((u) => (
                                    <div
                                        key={u._id}
                                        className='home-trending-item'
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)' }}
                                        onClick={() => window.location.href = `/profile/${u.username}`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                            {u.profilePic ? (
                                                <img
                                                    src={`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/uploads/profilePics/${u.profilePic}`}
                                                    alt={u.username}
                                                    className='home-trending-avatar'
                                                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div className='home-trending-avatar-placeholder' style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-strong)' }} />
                                            )}
                                            <span className='home-trending-username' style={{ fontSize: '0.9rem' }}>{u.username}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    )
}

export default HomePage
