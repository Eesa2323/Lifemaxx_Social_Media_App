import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Skeleton from "../components/Skeleton"
import Spinner from "../components/Spinner"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import { produce } from "immer"
import axios from "axios"
import { useSelector } from "react-redux"
import { Modal as MuiModal } from "@mui/material"
import Button from "../components/Button"

const CATEGORIES = [
    {
        id: "Fitness",
        title: "Fitness",
        description: "Build your dream physique and optimize health",
        icon: "💪",
    },
    {
        id: "Money",
        title: "Money",
        description: "Entrepreneurship and career development",
        icon: "💼",
    },
    {
        id: "Self-Improvement",
        title: "Self-Improvement",
        description: "Personal development and growth",
        icon: "🎯",
    },
    {
        id: "LooksMaxxing",
        title: "Looksmaxxing",
        description: "Optimize your appearance and style",
        icon: "✨",
    },
    {
        id: "Other",
        title: "Other",
        description: "Anything else that doesn't fit",
        icon: "🧩",
    },
]

// Reorder specifically for the Find Community modal: Looksmaxxing before Self-Improvement
const SEARCH_CATEGORIES = [
    CATEGORIES.find((c) => c.id === "Fitness"),
    CATEGORIES.find((c) => c.id === "Money"),
    CATEGORIES.find((c) => c.id === "LooksMaxxing"),
    CATEGORIES.find((c) => c.id === "Self-Improvement"),
].filter(Boolean)

const Communities = () => {
    const navigate = useNavigate()
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [searchCategory, setSearchCategory] = useState(null)
    const [communityTitle, setCommunityTitle] = useState("")
    const [communityDescription, setCommunityDescription] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)
    const [createError, setCreateError] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    // const [searchResults, setSearchResults] = useState([])
    const [searchError, setSearchError] = useState("")
    const [isJoining, setIsJoining] = useState(false)
    // const [communities, setCommunities] = useState([])
    const [loadingCommunities, setLoadingCommunities] = useState(false)
    const queryClient = useQueryClient()
    const axiosPrivate = useAxiosPrivate()
    const userData = useSelector((state) => state.auth.userData)
    const token = useSelector((state) => state.auth.token)

    const {
        data: communities,
        error,
        isLoading,
        status,
        isFetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ["communities"],
        queryFn: async ({ pageParam = null }) => {
            const response = await axiosPrivate.get(`${BASE_URL}/api/communities/communities`, {
                params: { timestamp: pageParam },
            })
            return response.data
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: !!token,
    })

    // Debounce search text to avoid spamming the API while typing
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
    useEffect(() => {
        if (!token) {
            setDebouncedSearchQuery("")
            return
        }
        const t = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim())
        }, 500)
        return () => clearTimeout(t)
    }, [searchQuery, token])

    const {
        data: searchResults,
        isFetching: isFetchingSearch,
        isLoading: isLoadingSearch,
        status: searchStatus,
    } = useQuery({
        queryKey: ["communitiesSearch", debouncedSearchQuery, searchCategory],
        queryFn: async () => {
            const res = await axiosPrivate.get(`${BASE_URL}/api/communities/search`, {
                params: { searchTerm: debouncedSearchQuery, category: searchCategory ?? undefined },
            })
            return res.data
        },
        enabled: !!token && (!!debouncedSearchQuery || !!searchCategory),
    })

    console.log(error)

    // Derive pages and emptiness status to control UI states robustly
    const pages = communities?.pages || []
    const isEmptyCommunities =
        pages.length > 0 && pages.every((page) => !page?.data || page.data.length === 0)

    const createCommunityMutation = useMutation({
        mutationFn: async (data) => {
            const { name, category, description } = data
            const res = await axiosPrivate.post(`${BASE_URL}/api/communities/`, {
                name,
                category,
                description,
            })
            return res.data
        },
        onError: (err) => console.log(err),

        onSuccess: (data) => {
            queryClient.setQueryData(["communities"], (prevData) => {
                return produce(prevData, (draft) => {
                    if (!prevData) return

                    const page = draft.pages[0]
                    page.data.push(data)
                })
            })

            setIsCreateModalOpen(false)
        },
    })

    const joinMutatation = useMutation({
        mutationFn: async (data) => {
            const { communityId } = data
            const res = await axiosPrivate.post(`${BASE_URL}/api/communities/join/${communityId}`)
            return res.data
        },
        onError: (err) => {
            console.log(err)
        },
        onSuccess: (data, variables) => {
            const { communityId } = variables
            // Optimistically update search results
            queryClient.setQueryData(["communitiesSearch", searchQuery, searchCategory], (old) => {
                if (!old) return old
                return old.map((community) =>
                    community._id === communityId ? { ...community, isMember: true } : community,
                )
            })
            // Optimistically update communities list
            queryClient.setQueryData(["communities"], (old) => {
                if (!old) return old
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: page.data.map((community) =>
                            community._id === communityId
                                ? { ...community, isMember: true }
                                : community,
                        ),
                    })),
                }
            })
            // Optimistically update the individual community cache for the chat page
            queryClient.setQueryData(["community", communityId], (old) => {
                if (!old) return old
                return {
                    ...old,
                    isMember: true,
                    memberCount: (old.memberCount || 0) + 1,
                }
            })
            navigate(`/communities/${communityId}`)
        },
    })

    // Load mock communities on mount
    // useEffect(() => {
    //     const loadMockCommunities = async () => {
    //         setLoadingCommunities(true)
    //         try {
    //             // Simulate API delay
    //             await new Promise((resolve) => setTimeout(resolve, 1000))

    //             // Mock data
    //             const mockCommunities = [
    //                 {
    //                     id: "1",
    //                     title: "Fitness Enthusiasts",
    //                     category: "fitness",
    //                     memberCount: 150,
    //                     isPrivate: false,
    //                     role: "admin",
    //                 },
    //                 {
    //                     id: "2",
    //                     title: "Business Network",
    //                     category: "business",
    //                     memberCount: 75,
    //                     isPrivate: false,
    //                     role: "member",
    //                 },
    //             ]
    //             setCommunities(mockCommunities)
    //         } catch (error) {
    //             console.error("Error loading communities:", error)
    //         } finally {
    //             setLoadingCommunities(false)
    //         }
    //     }

    //     loadMockCommunities()
    // }, [])

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const handleCreateCommunity = async () => {
        console.log("Creating community...")
        const title = communityTitle.trim()
        const description = communityDescription.trim()
        if (!title || !description) return

        createCommunityMutation.mutate({ name: title, description, category: selectedCategory })

        // setIsCreating(true)
        // setCreateError("")

        // try {
        //     // Mock creating a community
        //     const newCommunity = {
        //         id: Date.now().toString(),
        //         title: communityTitle.trim(),
        //         category: selectedCategory,
        //         memberCount: 1,
        //         isPrivate: isPrivate,
        //         role: "admin",
        //     }

        //     setCommunities((prev) => [...prev, newCommunity])

        //     // Reset and close modal
        //     setSelectedCategory(null)
        //     setCommunityTitle("")
        //     setIsPrivate(false)
        //     setIsCreateModalOpen(false)

        //     // Navigate to the new community chat
        //     navigate(`/communities/${newCommunity.id}`)
        // } catch (err) {
        //     setCreateError("Failed to create community. Please try again.")
        //     console.error("Error creating community:", err)
        // } finally {
        //     setIsCreating(false)
        // }
    }

    const handleJoinCommunity = async (communityId) => {
        // setIsJoining(true)
        // setJoiningCommunityId(communityId)
        // setJoinError("")
        // try {
        //     // Mock joining a community
        //     const communityToJoin = searchResults.find((c) => c.id === communityId)
        //     if (communityToJoin) {
        //         setCommunities((prev) => [...prev, { ...communityToJoin, role: "member" }])
        //         navigate(`/communities/${communityId}`)
        //     }
        // } catch (err) {
        //     console.error("Error joining community:", err)
        //     setJoinError("Failed to join community")
        // } finally {
        //     setIsJoining(false)
        //     setJoiningCommunityId(null)
        // }
    }

    // const handleSearch = async () => {

    //     setIsSearching(true)
    //     setSearchError("")

    //     try {
    //         // Mock search results
    //         const mockResults = [
    //             {
    //                 id: "3",
    //                 title: "Fitness Goals 2024",
    //                 category: "fitness",
    //                 memberCount: 100,
    //                 isPrivate: false,
    //                 isMember: false,
    //             },
    //             {
    //                 id: "4",
    //                 title: "Startup Founders",
    //                 category: "business",
    //                 memberCount: 50,
    //                 isPrivate: false,
    //                 isMember: false,
    //             },
    //         ]

    //         // Filter mock results based on search criteria
    //         const filteredResults = mockResults.filter(
    //             (community) =>
    //                 (!searchCategory || community.category === searchCategory) &&
    //                 (!searchQuery.trim() ||
    //                     community.title.toLowerCase().includes(searchQuery.toLowerCase()))
    //         )

    //         setSearchResults(filteredResults)

    //         if (filteredResults.length === 0) {
    //             setSearchError("No communities found matching your criteria")
    //         }
    //     } catch (err) {
    //         console.error("Error searching communities:", err)
    //         setSearchError("Failed to search communities")
    //     } finally {
    //         setIsSearching(false)
    //     }
    // }

    // useEffect(() => {
    //     if (isSearchModalOpen) {
    //         handleSearch()
    //     }
    // }, [searchCategory])

    return (
        <div className='page-wrapper communities-page'>
            <div className='page-header'>
                <h1 className='page-title'>Communities</h1>
            </div>

            <div style={styles.buttonsContainer}>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    style={styles.actionButton}
                >
                    + Create Community
                </button>
                <button
                    onClick={() => setIsSearchModalOpen(true)}
                    style={{
                        ...styles.actionButton,
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                    }}
                >
                    🔍 Find Community
                </button>
            </div>

            {/* Communities Section */}
            <div style={styles.communitiesSection}>
                {!token && (
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
                        <h3 style={styles.emptyStateTitle}>Please log in</h3>
                        <p style={styles.emptyStateDescription}>
                            Log in to view and join communities.
                        </p>
                        <div style={{ marginTop: 16 }}>
                            <button
                                onClick={() => navigate("/login")}
                                style={{
                                    backgroundColor: "#ff4444",
                                    color: "#fff",
                                    border: "none",
                                    padding: "0.6rem 1.25rem",
                                    borderRadius: 8,
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Log in
                            </button>
                        </div>
                    </div>
                )}
                {token && (isLoading || status === "pending") && !isEmptyCommunities && (
                    <div style={styles.communitiesGrid}>
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton
                                key={i}
                                variant='card'
                            />
                        ))}
                    </div>
                )}
                {token && !isLoading && status !== "pending" && (
                    <>
                        {isEmptyCommunities ? (
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
                                <h3 style={styles.emptyStateTitle}>No communities yet</h3>
                                <p style={styles.emptyStateDescription}>
                                    You haven't joined any communities yet.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={styles.communitiesGrid}>
                                    {pages.map((page, pageIndex) =>
                                        page?.data?.map((community) => (
                                            <div
                                                key={community._id}
                                                style={styles.communityCard}
                                                onClick={() =>
                                                    navigate(`/communities/${community._id}`, {
                                                        state: { community },
                                                    })
                                                }
                                            >
                                                <div style={styles.communityHeader}>
                                                    <h3 style={styles.communityTitle}>
                                                        {community.name}
                                                    </h3>
                                                    <span style={styles.categoryBadge}>
                                                        {
                                                            CATEGORIES.find(
                                                                (c) => c.id === community.category,
                                                            )?.icon
                                                        }
                                                    </span>
                                                </div>
                                                <div style={styles.communityInfo}>
                                                    <span>
                                                        {community.memberCount}{" "}
                                                        {community.memberCount <= 1
                                                            ? "member"
                                                            : "members"}
                                                    </span>
                                                    {community.isPrivate && (
                                                        <span style={styles.privateBadge}>
                                                            Private
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )),
                                    )}
                                </div>
                                {isFetchingNextPage && (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 12,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 28,
                                                height: 28,
                                                border: "3px solid rgba(255,255,255,0.2)",
                                                borderTop: "3px solid #fff",
                                                borderRadius: "50%",
                                                animation: "spin 0.9s linear infinite",
                                            }}
                                        />
                                    </div>
                                )}
                                {hasNextPage && !isFetchingNextPage && (
                                    <div style={{ display: "flex", justifyContent: "center" }}>
                                        <button
                                            onClick={() => fetchNextPage()}
                                            style={{
                                                marginTop: 12,
                                                padding: "10px 20px",
                                                borderRadius: 8,
                                                background: "#222",
                                                color: "white",
                                                border: "1px solid #333",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Load More
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Create Community Modal (MUI) - full screen on mobile */}
            <MuiModal
                open={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false)
                    setSelectedCategory(null)
                    setCommunityTitle("")
                    setIsPrivate(false)
                    setCreateError("")
                }}
                aria-labelledby='create-community-modal'
                sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <div
                    style={{
                        backgroundColor: "#121212",
                        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
                        padding: isMobile ? "16px" : "24px",
                        outline: "none",
                        borderRadius: isMobile ? "0" : "8px",
                        maxWidth: isMobile ? "100%" : "560px",
                        width: isMobile ? "100%" : "90%",
                        maxHeight: isMobile ? "100vh" : "600px",
                        height: isMobile ? "100vh" : "auto",
                        position: isMobile ? "fixed" : "relative",
                        top: isMobile ? 0 : "auto",
                        left: isMobile ? 0 : "auto",
                        right: isMobile ? 0 : "auto",
                        bottom: isMobile ? 0 : "auto",
                        paddingBottom: isMobile ? "20px" : "16px",
                        boxSizing: "border-box",
                        overflowY: "auto",
                    }}
                >
                    <div style={styles.modalContent}>
                        <h2 style={styles.searchModalHeader}>Create community</h2>
                        <div style={styles.divider} />

                        <div style={styles.formGroup}>
                            <label style={{ ...styles.label, ...styles.categoryLabel }}>
                                <span>Category</span>
                            </label>
                            <div style={styles.categoryGrid}>
                                {CATEGORIES.map((category) => (
                                    <div
                                        key={category.id}
                                        style={{
                                            ...styles.categoryOption,
                                            ...(selectedCategory === category.id &&
                                                styles.selectedCategory),
                                        }}
                                        onClick={() => setSelectedCategory(category.id)}
                                    >
                                        <span style={styles.categoryIcon}>{category.icon}</span>
                                        <span style={styles.categoryTitle}>{category.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <input
                                spellCheck='false'
                                type='text'
                                value={communityTitle}
                                onChange={(e) => setCommunityTitle(e.target.value)}
                                placeholder='Enter community title...'
                                style={{ ...styles.input, ...{ marginTop: 10 } }}
                            />

                            <textarea
                                onChange={(e) => setCommunityDescription(e.target.value)}
                                value={communityDescription}
                                spellCheck='false'
                                style={{ ...styles.input, ...{ height: 100, marginTop: 10 } }}
                                placeholder='Enter Community Description...'
                            />
                        </div>

                        {createError && <p style={styles.error}>{createError}</p>}

                        <Button
                            onClick={handleCreateCommunity}
                            style={{
                                ...styles.createButton,
                            }}
                            disabled={
                                !selectedCategory ||
                                !communityTitle.trim() ||
                                !communityDescription.trim()
                            }
                        >
                            Create Community
                        </Button>
                    </div>
                </div>
            </MuiModal>

            {/* Search Modal */}
            <MuiModal
                open={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                aria-labelledby='search-communities-modal'
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        backgroundColor: "#121212",
                        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
                        padding: isMobile ? "16px" : "24px",
                        outline: "none",
                        borderRadius: isMobile ? "0" : "8px",
                        maxWidth: isMobile ? "100%" : "600px",
                        width: isMobile ? "100%" : "90%",
                        maxHeight: isMobile ? "100vh" : "600px",
                        height: isMobile ? "100vh" : "auto",
                        overflow: "auto",
                        position: isMobile ? "fixed" : "relative",
                        top: isMobile ? 0 : "auto",
                        left: isMobile ? 0 : "auto",
                        right: isMobile ? 0 : "auto",
                        bottom: isMobile ? 0 : "auto",
                        paddingBottom: isMobile ? "20px" : "16px",
                        boxSizing: "border-box",
                        overflowY: "auto",
                    }}
                >
                    {/* Inline CSS just for placeholder sizing/color in this modal */}
                    <style>
                        {`
                            .search-input::placeholder {
                                font-size: 0.9rem;
                                color: #888;
                            }
                        `}
                    </style>

                    <h2 style={styles.searchModalHeader}>Find communities</h2>
                    <div style={styles.divider} />

                    <div style={{ marginBottom: 16 }}>
                        <input
                            type='text'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder='Search communities...'
                            style={{
                                width: "100%",
                                padding: "0.65rem 0.8rem",
                                backgroundColor: "#1a1a1a",
                                border: "1px solid #333",
                                borderRadius: "8px",
                                color: "#fff",
                                fontSize: "0.95rem",
                                marginBottom: "1rem",
                            }}
                            className='search-input'
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Filter by Category</label>
                        <div style={styles.categoryGrid}>
                            {SEARCH_CATEGORIES.map((category) => (
                                <div
                                    key={category.id}
                                    style={{
                                        ...styles.categoryOption,
                                        ...(searchCategory === category.id &&
                                            styles.selectedCategory),
                                    }}
                                    onClick={() =>
                                        setSearchCategory(
                                            searchCategory === category.id ? null : category.id,
                                        )
                                    }
                                >
                                    <span style={styles.categoryIcon}>{category.icon}</span>
                                    <span style={styles.categoryTitle}>{category.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {searchError && <p style={styles.error}>{searchError}</p>}

                    <div style={styles.searchResults}>
                        {/* Loading skeletons while fetching search results */}
                        {isFetchingSearch && (
                            <div style={styles.searchSpinnerWrap}>
                                <Spinner
                                    withStyles={false}
                                    size={44}
                                />
                            </div>
                        )}

                        {/* Placeholder when no input/category to keep height stable */}
                        {!isFetchingSearch && !debouncedSearchQuery && !searchCategory && (
                            <div style={styles.searchPlaceholderBox}>
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
                                            cx='11'
                                            cy='11'
                                            r='7'
                                        />
                                        <line
                                            x1='21'
                                            y1='21'
                                            x2='16.65'
                                            y2='16.65'
                                        />
                                    </svg>
                                </div>
                                <h3 style={styles.emptyStateTitle}>Search for communities</h3>
                                <p style={styles.emptyStateDescription}>
                                    Type a name or choose a category to see results.
                                </p>
                            </div>
                        )}

                        {/* Results list */}
                        {!isFetchingSearch && searchResults?.length > 0 && (
                            <div style={styles.resultsList}>
                                {searchResults.map((community) => (
                                    <div
                                        key={community._id}
                                        style={styles.communityCard}
                                    >
                                        <div style={styles.communityHeader}>
                                            <h3 style={styles.communityTitle}>{community.name}</h3>
                                            <span style={styles.categoryBadge}>
                                                {
                                                    CATEGORIES.find(
                                                        (c) => c.id === community.category,
                                                    )?.icon
                                                }
                                            </span>
                                        </div>
                                        <div style={styles.communityInfo}>
                                            <span>{community.memberCount} members</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                            {token && !community.isMember && (
                                                <button
                                                    style={styles.joinButton}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        joinMutatation.mutate({
                                                            communityId: community._id,
                                                        })
                                                    }}
                                                    disabled={
                                                        joinMutatation.isLoading &&
                                                        joinMutatation.variables?.communityId ===
                                                            community._id
                                                    }
                                                >
                                                    {joinMutatation.isLoading &&
                                                    joinMutatation.variables?.communityId ===
                                                        community._id
                                                        ? "Joining..."
                                                        : "Join"}
                                                </button>
                                            )}
                                            <button
                                                style={{
                                                    ...styles.joinButton,
                                                    background: "#222",
                                                    color: "#fff",
                                                    border: "1px solid #333",
                                                }}
                                                onClick={() =>
                                                    navigate(`/communities/${community._id}`)
                                                }
                                            >
                                                View Community
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty state when no results */}
                        {!isFetchingSearch &&
                            (debouncedSearchQuery || searchCategory) &&
                            (searchResults?.length === 0 || !searchResults) && (
                                <div style={styles.searchPlaceholderBox}>
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
                                    <h3 style={styles.emptyStateTitle}>No results found</h3>
                                    <p style={styles.emptyStateDescription}>
                                        Try a different search term or category.
                                    </p>
                                </div>
                            )}
                    </div>
                </div>
            </MuiModal>
        </div>
    )
}

const styles = {
    container: {
        maxWidth: "1200px",
        margin: "80px auto 0",
        padding: "2rem",
    },
    header: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "3rem",
    },
    headerMobile: {
        flexDirection: "column",
        gap: "1.5rem",
    },
    title: {
        color: "#fff",
        fontSize: "2.5rem",
        margin: 0,
        textAlign: "center",
    },
    buttonsContainer: {
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        flexWrap: "wrap",
    },
    actionButton: {
        backgroundColor: "#ff4444",
        color: "#fff",
        border: "none",
        padding: "1rem 2rem",
        borderRadius: "4px",
        fontSize: "1rem",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        minWidth: "200px",
        justifyContent: "center",
    },
    signInMessage: {
        color: "#fff",
        textAlign: "center",
        fontSize: "1.1rem",
        marginTop: "2rem",
    },
    modalContent: {
        color: "#fff",
    },
    modalTitle: {
        fontSize: "1.5rem",
        marginBottom: "1.5rem",
        textAlign: "center",
    },
    searchModalHeader: {
        color: "#fff",
        fontSize: "1.15rem",
        fontWeight: 700,
        margin: "0 0 6px 0",
        textAlign: "left",
    },
    divider: {
        borderBottom: "1px solid #222",
        margin: "8px 0 12px",
    },
    formGroup: {},
    label: {
        display: "block",
        marginBottom: "0.5rem",
        color: "#fff",
        fontSize: "0.9rem",
    },
    categoryLabel: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "10px",
        marginBottom: "8px",
        fontWeight: 700,
        color: "#ffffff",
        fontSize: "0.95rem",
        letterSpacing: "0.2px",
    },
    requiredPill: {
        backgroundColor: "#161616",
        border: "1px solid #333",
        color: "#ff4444",
        borderRadius: "9999px",
        marginTop: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        minWidth: 18,
        fontSize: "0.75rem",
        lineHeight: 1,
        fontWeight: 700,
    },
    switchLabel: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        cursor: "pointer",
    },
    checkbox: {
        width: "18px",
        height: "18px",
        cursor: "pointer",
    },
    switchText: {
        fontSize: "0.9rem",
        color: "#fff",
    },
    categoryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "1rem",
        marginBottom: "1rem",
    },
    categoryOption: {
        backgroundColor: "#1a1a1a",
        padding: "1rem",
        borderRadius: "4px",
        cursor: "pointer",
        textAlign: "center",
        transition: "background-color 0.2s",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    selectedCategory: {
        backgroundColor: "#ff4444",
    },
    categoryIcon: {
        display: "block",
        fontSize: "1.5rem",
        marginBottom: "0.5rem",
    },
    categoryTitle: {
        display: "block",
        marginTop: "0.5rem",
        marginLeft: 0,
    },
    input: {
        width: "100%",
        padding: "0.75rem",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "1rem",
    },
    error: {
        color: "#ff4444",
        marginBottom: "1rem",
        fontSize: "0.9rem",
    },
    createButton: {
        backgroundColor: "#ff4444",
        color: "#fff",
        border: "none",
        padding: "0.75rem 1.5rem",
        borderRadius: "4px",
        fontSize: "1rem",
        fontWeight: "500",
        cursor: "pointer",
        width: "100%",
        transition: "opacity 0.2s",
    },
    searchInput: {
        width: "100%",
        padding: "1rem",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "1rem",
        marginBottom: "1rem",
    },
    searchResults: {
        marginTop: "1rem",
        minHeight: 0,
        overflowY: "visible",
    },
    resultsList: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "12px",
    },
    searchSpinnerWrap: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 220,
        padding: 12,
    },
    searchPlaceholderBox: {
        color: "#999",
        textAlign: "center",
        padding: "2rem",
        backgroundColor: "#1a1a1a",
        borderRadius: "4px",
        lineHeight: "1.5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 220,
    },
    searchMessage: {
        color: "#999",
        textAlign: "center",
        padding: "1rem",
    },
    communityCard: {
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        padding: "1.5rem",
        cursor: "pointer",
        transition: "all 0.2s ease",
        border: "1px solid #333",
        minHeight: "160px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        "&:hover": {
            backgroundColor: "#222",
            transform: "translateY(-2px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        },
    },
    communityHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.5rem",
    },
    communityTitle: {
        color: "#fff",
        fontSize: "1.1rem",
        margin: 0,
    },
    categoryBadge: {
        fontSize: "1.2rem",
    },
    communityInfo: {
        display: "flex",
        gap: "1rem",
        color: "#999",
        fontSize: "0.9rem",
        marginBottom: "1rem",
    },
    privateBadge: {
        backgroundColor: "#333",
        color: "#fff",
        padding: "0.2rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.8rem",
    },
    joinButton: {
        backgroundColor: "#ff4444",
        color: "#fff",
        border: "none",
        padding: "0.5rem 1rem",
        borderRadius: "4px",
        cursor: "pointer",
        width: "100%",
        fontSize: "0.9rem",
        transition: "opacity 0.2s",
    },
    communitiesSection: {
        marginTop: "2rem",
    },
    sectionTitle: {
        color: "#fff",
        fontSize: "1.5rem",
        marginBottom: "1rem",
    },
    communitiesGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1.5rem",
        padding: "1rem 0",
    },
    emptyState: {
        color: "#999",
        textAlign: "center",
        padding: "2rem",
        backgroundColor: "#1a1a1a",
        borderRadius: "4px",
        lineHeight: "1.5",
    },
    emptyStateIcon: {
        marginBottom: 8,
    },
    roleBadge: {
        backgroundColor: "#ff4444",
        color: "#fff",
        padding: "0.2rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.8rem",
        textTransform: "capitalize",
    },
}

export default Communities
