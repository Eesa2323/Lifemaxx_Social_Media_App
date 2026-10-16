import React from "react"
import { Fragment, useState, useEffect } from "react"
import { BASE_URL, SMALL_SCREEN_SIZE } from "../utils/config"
import Modal from "@mui/material/Modal"
import "../index.css"
import ImageList from "@mui/material/ImageList"
import ImageListItem from "@mui/material/ImageListItem"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import Spinner from "./Spinner"
import { useSelector } from "react-redux"
// import {
//     LockOutlined as LockOutlinedIcon,
//     Portrait as TagIcon,
//     GridOn as GridIcon,
// } from "@mui/icons-material"
import useUsers from "../hooks/useUsers"
import Skeleton from "./Skeleton"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { useNavigate } from "react-router-dom"
import JourneyCard from "./JourneyCard"
import axios from "../utils/axios"
import journeyIcon from "../assets/imgs/journey-icon.png"

const JourneyGallery = ({ profileInfo, mode = "profile", searchTerm = "", filter = "all" }) => {
    const [selectedTabIndex, setSelectedTabIndex] = useState(0)
    const [currentPostData, setCurrentPostData] = useState({ id: null, pageIndex: null })
    const { useProfileQuery } = useUsers()
    const axiosPrivate = useAxiosPrivate()
    const navigate = useNavigate()
    const userId = useSelector((state) => state.auth.userData?._id)
    const token = useSelector((state) => state.auth.token)
    const isDiscover = mode === "discover"
    const journeys = useInfiniteQuery({
        queryKey: ["journeys", profileInfo?._id],
        initialPageParam: undefined,
        queryFn: async ({ pageParam = null }) => {
            const response = await axios.get(`${BASE_URL}/api/journeys`, {
                params: { cursor: pageParam, id: profileInfo?._id },
                headers: { "x-auth-token": token },
            })
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: Infinity,
        enabled: !!profileInfo?._id && !isDiscover,
    })
    // destructure commonly used query flags for clarity
    const {
        data: journeysData,
        isLoading: journeysIsLoading,
        isFetching: journeysIsFetching,
        isError: journeysIsError,
        fetchNextPage: journeysFetchNextPage,
        hasNextPage: journeysHasNextPage,
        isFetchingNextPage: journeysIsFetchingNextPage,
    } = journeys

    const { ref: loadMoreRef, inView } = useInView({ threshold: 0, rootMargin: "200px" })

    useEffect(() => {
        if (inView && journeysHasNextPage && !journeysIsFetchingNextPage) {
            journeysFetchNextPage()
        }
    }, [inView, journeysHasNextPage, journeysIsFetchingNextPage, journeysFetchNextPage])
    const { isLoading: isProfileLoading } = useProfileQuery(profileInfo?.username, false)

    // Discover feed query (reuses this component for DiscoverPage)
    const discovers = useInfiniteQuery({
        queryKey: ["discovers", { searchTerm, filter }],
        queryFn: async ({ pageParam = null, queryKey }) => {
            const [_key, { searchTerm, filter }] = queryKey
            const params = {
                limit: 10,
                ...(searchTerm ? { search: searchTerm } : {}),
                ...(filter && filter !== "all" ? { category: filter } : {}),
                ...(pageParam ? { cursor: pageParam } : {}),
            }
            const response = await axios.get(`${BASE_URL}/api/discovers/`, {
                params,
                headers: { "x-auth-token": token },
            })
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 1000 * 60 * 2,
        enabled: isDiscover,
    })

    // Discover mode rendering
    if (isDiscover) {
        const discoveries = discovers.data?.pages?.flatMap((page) => page.journeys) || []
        const skeletonCount = 5
        return (
            <div
                style={{ width: "100%", marginTop: "1rem" }}
                className='d-flex flex-column'
            >
                <div style={styles.journeyList}>
                    {discovers.isLoading ? (
                        Array.from({ length: skeletonCount }).map((_, i) => (
                            <Skeleton
                                key={i}
                                variant='card'
                                style={styles.skeletonCard}
                            />
                        ))
                    ) : discoveries.length > 0 ? (
                        discoveries.map((item) => {
                            const imageSrc = item?.url ? `${BASE_URL}${item.url}` : journeyIcon
                            const journeyWithImage = { ...item, image: imageSrc }
                            return (
                                <JourneyCard
                                    key={item._id}
                                    journey={journeyWithImage}
                                    layout='columnRightMeta'
                                    showImage={true}
                                    showCreator={true}
                                    showDate={true}
                                    showTags={true}
                                    onClick={() =>
                                        navigate(`/journeys/${item._id}`, {
                                            state: { journey: item },
                                        })
                                    }
                                />
                            )
                        })
                    ) : (
                        <div style={styles.emptyState}>
                            <p style={styles.emptyStateDescription}>No results found.</p>
                        </div>
                    )}
                    {discovers.isFetchingNextPage && (
                        <div style={styles.journeyList}>
                            {[...Array(3)].map((_, i) => (
                                <Skeleton
                                    key={`more-${i}`}
                                    variant='card'
                                    style={styles.skeletonCard}
                                />
                            ))}
                        </div>
                    )}
                </div>
                {discovers.hasNextPage && !discovers.isLoading && (
                    <button
                        onClick={() => discovers.fetchNextPage()}
                        style={{
                            margin: "24px auto 0 auto",
                            padding: "12px 32px",
                            borderRadius: 12,
                            background: "#222",
                            color: "white",
                            border: "1px solid #333",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Load More
                    </button>
                )}
            </div>
        )
    }

    // Profile mode rendering (updated)
    return (
        <div
            style={{ width: "100%", marginTop: "1rem" }}
            className='d-flex flex-column'
        >
            {!isProfileLoading ? (
                <>
                    {profileInfo?.isBlocked ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyStateIcon}>
                                <svg
                                    width='64'
                                    height='64'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='#666'
                                    strokeWidth='1.5'
                                >
                                    <circle
                                        cx='12'
                                        cy='12'
                                        r='10'
                                    />
                                    <path d='m4.9 4.9 14.2 14.2' />
                                </svg>
                            </div>
                            <h3 style={styles.emptyStateTitle}>Unavailable</h3>
                            <p style={styles.emptyStateDescription}>
                                This content is not available.
                            </p>
                        </div>
                    ) : journeysIsLoading || journeysIsFetching ? (
                        // Show skeletons matching journey card size while loading/fetching
                        <div style={styles.journeyList}>
                            {[...Array(6)].map((_, i) => (
                                <Skeleton
                                    key={i}
                                    variant='card'
                                    style={styles.skeletonCard}
                                />
                            ))}
                        </div>
                    ) : journeysIsError ? (
                        <div style={styles.errorMessage}>
                            Error loading journeys. Please try again later.
                        </div>
                    ) : (
                        <>
                            <div style={styles.journeyList}>
                                {journeysData?.pages.map((page) =>
                                    page.data.map((journey) => {
                                        const imageSrc = journey?.url
                                            ? `${BASE_URL}/uploads/journeyThumbnails/${journey.url}`
                                            : journeyIcon
                                        const journeyWithImage = { ...journey, image: imageSrc }
                                        return (
                                            <JourneyCard
                                                key={journey._id}
                                                journey={journeyWithImage}
                                                onClick={() =>
                                                    navigate(`/journeys/${journey._id}`, {
                                                        state: { journey },
                                                    })
                                                }
                                                layout='columnRightMeta'
                                                showImage={true}
                                                showCreator={true}
                                                showDate={true}
                                                showTags={true}
                                            />
                                        )
                                    })
                                )}

                                {(!journeysData?.pages ||
                                    journeysData.pages.every(
                                        (page) => !page.data || page.data.length === 0
                                    )) && (
                                    <div style={styles.emptyState}>
                                        <div style={styles.emptyStateIcon}>
                                            <svg
                                                width='64'
                                                height='64'
                                                viewBox='0 0 24 24'
                                                fill='none'
                                                stroke='#666'
                                                strokeWidth='1.5'
                                            >
                                                <path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' />
                                                <polyline points='14,2 14,8 20,8' />
                                                <line
                                                    x1='16'
                                                    y1='13'
                                                    x2='8'
                                                    y2='13'
                                                />
                                                <line
                                                    x1='16'
                                                    y1='17'
                                                    x2='8'
                                                    y2='17'
                                                />
                                                <polyline points='10,9 9,9 8,9' />
                                            </svg>
                                        </div>
                                        <h3 style={styles.emptyStateTitle}>No journeys yet</h3>
                                        <p style={styles.emptyStateDescription}>
                                            This user hasn't created any journeys yet.
                                        </p>
                                    </div>
                                )}

                                {/* sentinel for infinite scroll */}
                                {journeysHasNextPage && (
                                    <div
                                        ref={loadMoreRef}
                                        style={{ height: 1 }}
                                    />
                                )}
                            </div>

                            {/* Bottom spinner when fetching next page */}
                            {journeysIsFetchingNextPage && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        padding: 12,
                                    }}
                                >
                                    <Spinner
                                        withStyles={false}
                                        size={20}
                                        noDelay={true}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </>
            ) : (
                <Spinner
                    delayTime={160}
                    size={30}
                    withStyles={false}
                />
            )}
        </div>
    )
}

const styles = {
    container: {
        padding: "0.75rem",
        paddingTop: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
        "@media (min-width: 768px)": {
            padding: "2rem",
            paddingTop: "4rem",
        },
    },
    header: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginBottom: "2.5rem",
        "@media (min-width: 768px)": {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1.5rem",
            marginBottom: "3.5rem",
        },
    },
    title: {
        color: "#fff",
        margin: 0,
        fontSize: "1.75rem",
        lineHeight: "1.2",
        letterSpacing: "-0.02em",
        fontWeight: "600",
        "@media (min-width: 768px)": {
            fontSize: "2.25rem",
        },
    },
    subtitle: {
        color: "#fff",
        marginTop: "2rem",
        marginBottom: "1.5rem",
        fontSize: "1.25rem",
        lineHeight: "1.3",
        letterSpacing: "-0.01em",
        fontWeight: "500",
        "@media (min-width: 768px)": {
            marginTop: "3rem",
            marginBottom: "2rem",
            fontSize: "1.5rem",
        },
    },
    journeyList: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "100%",
        maxWidth: 960,
        margin: "0 auto",
        marginBottom: "2rem",
        padding: "0 8px",
        "@media (min-width: 768px)": {
            gap: "1.25rem",
            marginBottom: "2.5rem",
            padding: 0,
        },
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "3rem 1.5rem",
        marginTop: "2rem",
        backgroundColor: "#0a0a0a",
        borderRadius: "16px",
        border: "1px solid #1a1a1a",
        maxWidth: "500px",
        margin: "2rem auto 0 auto",
        "@media (min-width: 768px)": {
            padding: "4rem 2rem",
            marginTop: "3rem",
        },
    },
    emptyStateIcon: {
        marginBottom: "1.5rem",
        opacity: 0.7,
        "@media (min-width: 768px)": {
            marginBottom: "2rem",
        },
    },
    emptyStateTitle: {
        color: "#fff",
        fontSize: "1.5rem",
        fontWeight: "600",
        margin: "0 0 1rem 0",
        letterSpacing: "-0.02em",
        "@media (min-width: 768px)": {
            fontSize: "1.75rem",
            marginBottom: "1.25rem",
        },
    },
    emptyStateDescription: {
        color: "#999",
        fontSize: "1rem",
        lineHeight: "1.6",
        margin: 0,
        maxWidth: "400px",
        "@media (min-width: 768px)": {
            fontSize: "1.125rem",
        },
    },
    journeyCard: {
        backgroundColor: "#111",
        borderRadius: "12px",
        padding: "1.25rem",
        border: "1px solid #333",
        transition: "transform 0.2s, border-color 0.2s",
        cursor: "pointer",
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        "@media (min-width: 768px)": {
            padding: "1.5rem",
            minHeight: "140px",
        },
        "&:hover": {
            transform: "translateY(-2px)",
            borderColor: "#444",
        },
        "&:active": {
            transform: "translateY(1px)",
        },
    },
    journeyTitle: {
        color: "#fff",
        marginTop: 0,
        marginBottom: "0.75rem",
        fontSize: "1.25rem",
        lineHeight: "1.3",
        letterSpacing: "-0.01em",
        fontWeight: "500",
        "@media (min-width: 768px)": {
            fontSize: "1.375rem",
            marginBottom: "1rem",
        },
    },
    journeyDescription: {
        color: "#999",
        marginBottom: "auto",
        fontSize: "0.9375rem",
        lineHeight: "1.6",
        "@media (min-width: 768px)": {
            fontSize: "1rem",
        },
    },
    tagContainer: {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        marginTop: "1.25rem",
        "@media (min-width: 768px)": {
            gap: "0.625rem",
            marginTop: "1.5rem",
        },
    },
    tag: {
        backgroundColor: "#222",
        color: "#fff",
        padding: "0.375rem 0.75rem",
        borderRadius: "20px",
        fontSize: "0.8125rem",
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
        "@media (min-width: 768px)": {
            padding: "0.375rem 0.875rem",
            fontSize: "0.875rem",
        },
    },
    modalContent: {
        padding: "1.25rem",
        paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100vh",
        overflowY: "auto",
        "@media (min-width: 768px)": {
            padding: "2.5rem",
            maxHeight: "90vh",
        },
    },
    modalTitle: {
        marginTop: 0,
        marginBottom: "2rem",
        fontSize: "1.375rem",
        lineHeight: "1.3",
        letterSpacing: "-0.01em",
        fontWeight: "600",
        "@media (min-width: 768px)": {
            fontSize: "1.75rem",
            marginBottom: "2.5rem",
        },
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        "@media (min-width: 768px)": {
            gap: "2rem",
        },
    },
    formContent: {
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        "@media (min-width: 768px)": {
            gap: "2rem",
        },
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        "@media (min-width: 768px)": {
            gap: "0.75rem",
        },
    },
    label: {
        color: "#fff",
        fontSize: "0.9375rem",
        fontWeight: "500",
        letterSpacing: "0.01em",
        "@media (min-width: 768px)": {
            fontSize: "1rem",
        },
    },
    input: {
        padding: "0.875rem 1rem",
        backgroundColor: "#111",
        border: "1px solid #333",
        borderRadius: "8px",
        color: "#fff",
        fontSize: "1rem",
        width: "100%",
        transition: "border-color 0.2s",
        minHeight: "48px",
        letterSpacing: "0.01em",
        "&:focus": {
            borderColor: "#666",
            outline: "none",
        },
    },
    textarea: {
        padding: "0.875rem 1rem",
        backgroundColor: "#111",
        border: "1px solid #333",
        borderRadius: "8px",
        color: "#fff",
        fontSize: "1rem",
        resize: "vertical",
        fontFamily: "inherit",
        width: "100%",
        minHeight: "140px",
        transition: "border-color 0.2s",
        letterSpacing: "0.01em",
        lineHeight: "1.5",
        "&:focus": {
            borderColor: "#666",
            outline: "none",
        },
    },
    tagsSection: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        "@media (min-width: 768px)": {
            gap: "0.75rem",
        },
    },
    tagsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "0.625rem",
        "@media (min-width: 768px)": {
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.75rem",
        },
    },
    selectableTag: {
        backgroundColor: "#111",
        color: "#fff",
        padding: "0.75rem 0.5rem",
        borderRadius: "8px",
        border: "1px solid #333",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.2s",
        fontSize: "0.875rem",
        letterSpacing: "0.01em",
        userSelect: "none",
        minHeight: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "@media (min-width: 768px)": {
            fontSize: "0.9375rem",
            padding: "0.75rem",
        },
        "&:hover": {
            borderColor: "#444",
            backgroundColor: "#1a1a1a",
        },
        "&:active": {
            transform: "translateY(1px)",
        },
    },
    selectedTag: {
        backgroundColor: "#ff4444",
        borderColor: "#ff4444",
        "&:hover": {
            backgroundColor: "#ff3333",
            borderColor: "#ff3333",
        },
    },
    selectedTagsContainer: {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "1rem",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        border: "1px solid #333",
        marginTop: "0.5rem",
        "@media (min-width: 768px)": {
            marginTop: "1rem",
        },
    },
    selectedTagChip: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        backgroundColor: "#ff4444",
        color: "#fff",
        padding: "0.375rem 0.75rem",
        borderRadius: "20px",
        fontSize: "0.875rem",
        cursor: "pointer",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "#ff3333",
        },
    },
    removeTag: {
        fontSize: "1.25rem",
        fontWeight: "bold",
        marginLeft: "0.25rem",
    },
    submitButton: {
        width: "100%",
        backgroundColor: "#ff4444",
        marginTop: "0.5rem",
    },
    submitSection: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        marginTop: "0.5rem",
    },
    errorMessage: {
        color: "#ff4444",
        fontSize: "0.875rem",
        textAlign: "center",
        padding: "0.5rem",
        backgroundColor: "rgba(255, 68, 68, 0.1)",
        borderRadius: "6px",
        width: "100%",
    },
    skeletonCard: {
        minHeight: "120px",
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        "@media (min-width: 768px)": {
            minHeight: "140px",
        },
    },
}

export default JourneyGallery
