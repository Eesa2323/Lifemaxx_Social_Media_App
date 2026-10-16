import React, { useState, useRef, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useInfiniteQuery } from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import Skeleton from "../components/Skeleton"
import ProfilePic from "../components/ProfilePic"

const styles = {
    container: {
        height: "100%",
        color: "white",
        padding: "24px 16px",
        marginTop: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    header: {
        maxWidth: 960,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#ccc",
        marginBottom: 24,
    },
    button: {
        padding: "10px 24px",
        borderRadius: 8,
        background: "#ff4444",
        color: "white",
        fontWeight: "bold",
        border: "none",
        fontSize: 16,
        marginBottom: 32,
        cursor: "pointer",
    },
    controls: {
        display: "flex",
        gap: 12,
        marginBottom: 24,
        flexWrap: "wrap",
        width: "100%",
        maxWidth: 800,
    },
    input: {
        flex: 1,
        minWidth: 250,
        width: "100%",
        maxWidth: 400,
        padding: "8px 12px",
        borderRadius: 12,
        backgroundColor: "#1c1c1c",
        color: "white",
        border: "1px solid #333",
    },
    select: {
        padding: "8px 12px",
        borderRadius: 12,
        backgroundColor: "#1c1c1c",
        color: "white",
        border: "1px solid #333",
        minWidth: 120,
    },
    cardGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 420px))",
        gap: 20,
        width: "100%",
        justifyContent: "center",
        padding: "12px 16px",
        boxSizing: "border-box",
    },
    card: {
        backgroundColor: "#1a1a1a",
        borderRadius: 12,
        padding: 20,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        transition: "border-color 0.2s, box-shadow 0.2s",
        border: "1px solid #333",
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
    },
    cardUsername: {
        fontWeight: 600,
        fontSize: 18,
        color: "#fff",
        margin: 0,
    },
    cardUserMeta: {
        color: "#888",
        fontSize: 14,
        marginTop: 2,
    },
    cardBio: {
        color: "#e0e0e0",
        fontSize: 14,
        lineHeight: 1.6,
        margin: "8px 0 10px 0",
    },
    completedJourneysBadge: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "4px 8px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 12,
        fontSize: 12,
        minHeight: 24,
        width: "fit-content",
        marginTop: 6,
    },
    badgeIcon: {
        fontSize: 14,
        width: 14,
        height: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
    },
    badgeText: {
        color: "#fff",
        fontWeight: 500,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
    },
    noResults: {
        textAlign: "center",
        color: "#555",
        width: "100%",
        padding: "40px 0",
    },
}

const sortOptions = [
    { value: "username", label: "Username" },
    { value: "location", label: "Location" },
    { value: "category", label: "Category" },
]

const CATEGORY_LIST = [
    { value: "Fitness", label: "Fitness" },
    { value: "Money", label: "Money" },
    { value: "Self-Improvement", label: "Self-Improvement" },
    { value: "Looksmaxxing", label: "Looksmaxxing" },
]

const getSearchPlaceholder = (sort) =>
    sort === "location" ? "Search by location..." : "Search by username..."

const ConnectPage = () => {
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedTerm, setDebouncedTerm] = useState("")
    const [sort, setSort] = useState("username")
    const [category, setCategory] = useState("")
    // bump this whenever filters change so the infiniteQuery resets
    const [filtersVersion, setFiltersVersion] = useState(0)
    const [showCategoryMenu, setShowCategoryMenu] = useState(false)
    const navigate = useNavigate()
    const axiosPrivate = useAxiosPrivate()
    const observer = useRef()

    // Debounce search term to avoid stale results and flicker while typing
    useEffect(() => {
        const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300)
        return () => clearTimeout(t)
    }, [searchTerm])

    const queryKey = [
        "connect-users",
        { searchTerm: debouncedTerm, sort, category },
        filtersVersion,
    ]
    const queryFn = async ({ pageParam = null }) => {
        // Preserve the user's selected sort; only fall back to createdAt when sorting by username with no search
        const effectiveSort = !debouncedTerm && sort === "username" ? "createdAt" : sort
        const params = {
            limit: 10,
            sort: effectiveSort,
            ...(debouncedTerm ? { search: debouncedTerm } : {}),
            ...(sort === "category" && category ? { category } : {}),
            ...(pageParam ? { cursor: pageParam } : {}),
        }
        const res = await axiosPrivate.get(`${BASE_URL}/api/users/connect-list`, { params })
        return res.data
    }
    const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch } =
        useInfiniteQuery({
            queryKey,
            queryFn,
            getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
            staleTime: 1000 * 60 * 2,
        })

    // Combine all pages
    const users = data?.pages?.flatMap((page) => page.users) || []
    const skeletonCount = 5

    // Infinite scroll observer
    const listEndRef = useRef()
    const lastUserRef = useCallback(
        (node) => {
            if (isFetchingNextPage) return
            if (observer.current) observer.current.disconnect()
            observer.current = new window.IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNextPage) {
                    fetchNextPage()
                }
            })
            if (node) observer.current.observe(node)
        },
        [isFetchingNextPage, fetchNextPage, hasNextPage],
    )

    return (
        <div
            className='page-wrapper connect-page'
            style={{ padding: "24px 4vw", minHeight: "100vh" }}
        >
            <div className='page-header'>
                <div>
                    <h1 className='page-title'>Connect</h1>
                    <p className='page-subtitle'>
                        Find and connect with other users on the platform.
                    </p>
                </div>
                <button
                    style={styles.button}
                    onClick={() => navigate("/startup")}
                >
                    Go to Startup Hub
                </button>
                <div
                    style={{
                        ...styles.controls,
                        flexDirection: "row",
                        flexWrap: "wrap",
                        width: "100%",
                        maxWidth: 600,
                        gap: 8,
                        position: "relative",
                    }}
                >
                    <input
                        type='text'
                        placeholder={getSearchPlaceholder(sort)}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ ...styles.input, flex: 1, minWidth: 0, width: "100%" }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                // bump filtersVersion so the query key changes and results reset
                                setFiltersVersion((v) => v + 1)
                                refetch()
                            }
                        }}
                    />
                    <div style={{ position: "relative" }}>
                        <select
                            value={
                                sort === "category"
                                    ? category
                                        ? `category-${category}`
                                        : "category"
                                    : sort
                            }
                            onChange={(e) => {
                                const val = e.target.value
                                if (val === "category") {
                                    setShowCategoryMenu((prev) => !prev)
                                } else if (val.startsWith("category-")) {
                                    setSort("category")
                                    setCategory(val.replace("category-", ""))
                                    setShowCategoryMenu(false)
                                    // bump filtersVersion so the query resets
                                    setFiltersVersion((v) => v + 1)
                                } else {
                                    setSort(val)
                                    setCategory("")
                                    setShowCategoryMenu(false)
                                    // bump filtersVersion so the query resets
                                    setFiltersVersion((v) => v + 1)
                                }
                            }}
                            style={styles.select}
                            onBlur={() => setShowCategoryMenu(false)}
                        >
                            {sortOptions.map((opt) => (
                                <option
                                    key={opt.value}
                                    value={opt.value}
                                >
                                    {opt.label}
                                </option>
                            ))}
                            {/* If a category is selected, show it as the selected option */}
                            {sort === "category" && category && (
                                <option
                                    value={`category-${category}`}
                                >{`Category > ${category}`}</option>
                            )}
                        </select>
                        {/* Custom dropdown for categories */}
                        {showCategoryMenu && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    background: "#1c1c1c",
                                    border: "1px solid #333",
                                    borderRadius: 12,
                                    zIndex: 10,
                                    minWidth: 160,
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                    fontSize: 16,
                                    fontFamily: "inherit",
                                    padding: 0,
                                    marginTop: 2,
                                    transition: "opacity 0.18s cubic-bezier(.4,0,.2,1)",
                                    opacity: showCategoryMenu ? 1 : 0,
                                }}
                                onMouseLeave={() => setShowCategoryMenu(false)}
                            >
                                {CATEGORY_LIST.map((cat) => (
                                    <div
                                        key={cat.value}
                                        onClick={() => {
                                            setSort("category")
                                            setCategory(cat.value)
                                            setShowCategoryMenu(false)
                                            // bump filtersVersion so the query resets
                                            setFiltersVersion((v) => v + 1)
                                        }}
                                        style={{
                                            padding: "10px 18px",
                                            cursor: "pointer",
                                            color: category === cat.value ? "#ff4444" : "white",
                                            background:
                                                category === cat.value ? "#232323" : "#1c1c1c",
                                            fontWeight: 500,
                                            borderBottom: "1px solid #222",
                                            borderRadius: 0,
                                            transition: "background 0.15s, color 0.15s",
                                            fontFamily: "inherit",
                                        }}
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        {cat.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div style={styles.cardGrid}>
                {isLoading ? (
                    Array.from({ length: skeletonCount }).map((_, i) => (
                        <Skeleton
                            key={i}
                            variant='card'
                            style={{ height: 180, borderRadius: 12, padding: 16 }}
                        />
                    ))
                ) : users.length > 0 ? (
                    users.map((user, idx) => {
                        const isLast = idx === users.length - 1
                        return (
                            <div
                                key={user._id}
                                style={styles.card}
                                onClick={() => navigate(`/profile/${user.username}`)}
                                ref={isLast ? lastUserRef : undefined}
                            >
                                <div style={styles.cardHeader}>
                                    <ProfilePic
                                        size={44}
                                        userId={user._id}
                                        src={user.profilePic}
                                    />
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <h3 style={styles.cardUsername}>{user.username}</h3>
                                        {user.location && (
                                            <span style={styles.cardUserMeta}>
                                                📍 {user.location}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={styles.completedJourneysBadge}>
                                    <span style={styles.badgeIcon}>🏁</span>
                                    <span style={styles.badgeText}>
                                        {user.completedJourneys ?? 0} completed
                                    </span>
                                </div>
                                {user.bio && <div style={styles.cardBio}>{user.bio}</div>}
                                {user.interests && user.interests.length > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 8,
                                            marginTop: 6,
                                        }}
                                    >
                                        {user.interests.map((interest) => (
                                            <span
                                                key={interest}
                                                style={{
                                                    background: "#ff4444",
                                                    color: "white",
                                                    borderRadius: 16,
                                                    padding: "4px 12px",
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    letterSpacing: 0.2,
                                                }}
                                            >
                                                {interest}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div style={{ ...styles.noResults, gridColumn: "1 / -1" }}>No users found</div>
                )}
                {isFetchingNextPage &&
                    Array.from({ length: skeletonCount }).map((_, i) => (
                        <Skeleton
                            key={"fetching-" + i}
                            variant='card'
                            style={{ height: 180, borderRadius: 12, padding: 16 }}
                        />
                    ))}
                <div
                    ref={listEndRef}
                    style={{ gridColumn: "1 / -1" }}
                />
            </div>
        </div>
    )
}

export default ConnectPage
