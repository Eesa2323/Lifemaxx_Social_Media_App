import React, { useState, useRef, useCallback, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useMediaQuery } from "react-responsive"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useSelector } from "react-redux"

import JourneyPost from "../components/JourneyPost"
import StoriesBar from "../components/StoriesBar"

import { PostFeedMuteProvider } from "../contexts/PostFeedMuteContext"
import axios from "../utils/axios"

const HomePage = () => {
    const location = useLocation()
    const isNewSignup = location.state?.isNewSignup || false

    const isMobile = useMediaQuery({ maxWidth: 768 })

    const token = useSelector((state) => state.auth.token)

    const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null)
    const [inViewMap, setInViewMap] = useState({})

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
                <div className='home-page-head'>
                    <h1>Feed</h1>
                </div>
                <div className='home-page-actions'>
                    <button className='home-pill-btn'>Following</button>
                    <button className='home-pill-btn home-pill-secondary'>For you</button>
                </div>
            </div>

            <div className='home-grid'>
                <main className='home-left'>
                    {token && (
                        <div className='home-post-creator-card'>
                            <div className='creator-avatar' />
                            <div className='creator-content'>
                                <span className='creator-label'>Create a post</span>
                                <p className='creator-copy'>
                                    Share a story, journey, or photo with your network.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className='stories-panel'>
                        <div className='stories-panel-header'>Stories</div>
                        {token ? (
                            <StoriesBar />
                        ) : (
                            <p className='home-stories-placeholder'>
                                Sign in to browse stories from people you follow.
                            </p>
                        )}
                    </div>

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

                <aside className='home-aside'>
                    <div className='home-trending-card'>
                        <div className='home-trending-header'>Trending now</div>
                        <div className='home-trending-list'>
                            <div className='home-trending-item'>
                                <div>
                                    <strong>#CommunityFirst</strong>
                                    <p>20.4K posts</p>
                                </div>
                                <span>Live</span>
                            </div>
                            <div className='home-trending-item'>
                                <div>
                                    <strong>#JourneySpotlight</strong>
                                    <p>8.9K posts</p>
                                </div>
                                <span>Hot</span>
                            </div>
                            <div className='home-trending-item'>
                                <div>
                                    <strong>#LeaderStories</strong>
                                    <p>5.1K posts</p>
                                </div>
                                <span>New</span>
                            </div>
                        </div>
                    </div>

                    <div className='home-overview-card'>
                        <h2>Suggested actions</h2>
                        <div className='home-aside-list'>
                            <div className='home-aside-item'>
                                <span>Follow one new community</span>
                                <strong>Discover</strong>
                            </div>
                            <div className='home-aside-item'>
                                <span>Engage with trending posts</span>
                                <strong>React</strong>
                            </div>
                            <div className='home-aside-item'>
                                <span>Share your latest journey</span>
                                <strong>Post</strong>
                            </div>
                        </div>
                    </div>

                    {/* Location search removed from sidebar for Instagram-like layout */}
                </aside>
            </div>
        </div>
    )
}

export default HomePage
