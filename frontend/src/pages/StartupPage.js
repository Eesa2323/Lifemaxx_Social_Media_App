import React, { useState, useEffect, useRef } from "react"
import { Modal, Box } from "@mui/material"
import { BASE_URL, SMALL_SCREEN_SIZE } from "../utils/config"
import { useMediaQuery } from "react-responsive"
import {
    FaTags,
    FaLightbulb,
    FaAlignLeft,
    FaUserAlt,
    FaMapMarkerAlt,
    FaTrophy,
} from "react-icons/fa"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { FaMapMarkedAlt, FaCompass } from "react-icons/fa" // added icons for tabs // adjust import path
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import Spinner from "../components/Spinner"
import UnauthorizedLoginPopupModal from "../components/UnauthorizedLoginPopupModal"
import { FaLock } from "react-icons/fa"
import axios from "../utils/axios"
import { produce } from "immer"

// Mock data
const DUMMY_STARTUPS = [
    {
        id: 1,
        username: "founderAlice",
        title: "AI-Powered Chatbot Platform",
        caption: "Building intelligent chatbots.",
        requirements: ["JavaScript", "Node.js"],
    },
    {
        id: 2,
        username: "devBob",
        title: "Green Energy Solutions",
        caption: "Innovating solar panels.",
        requirements: ["Mechanical Engineering"],
    },
]

const categories = ["All", "Keywords"]

export default function StartupPage() {
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState("All")
    const [modalItem, setModalItem] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [showEdit, setShowEdit] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })
    const axiosPrivate = useAxiosPrivate()
    const userId = useSelector((state) => state.auth.userData?._id)
    const token = useSelector((state) => state.auth.token)
    const [openLoginModal, setOpenLoginModal] = useState(false)

    const queryClient = useQueryClient()
    const [tab, setTab] = useState("Your Journeys")

    const [newTitle, setNewTitle] = useState("")
    const [newDesc, setNewDesc] = useState("")
    const [keywordInput, setKeywordInput] = useState("")
    const [originalData, setOriginalData] = useState(null)
    const [hasChanges, setHasChanges] = useState(false)

    const navigate = useNavigate()
    const [keywords, setKeywords] = useState([])

    // Check for changes when editing
    useEffect(() => {
        if (showEdit && originalData) {
            const hasChanges =
                newTitle !== originalData.title ||
                newDesc !== originalData.description ||
                JSON.stringify(keywords) !== JSON.stringify(originalData.keywords || [])
            setHasChanges(hasChanges)
        }
    }, [showEdit, originalData, newTitle, newDesc, keywords])

    const filtered = DUMMY_STARTUPS.filter((item) => {
        const matchText =
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.caption.toLowerCase().includes(search.toLowerCase())
        const matchCat =
            category === "All" ||
            (category === "AI" && item.requirements.includes("Machine Learning"))
        return matchText && matchCat
    })

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status: listStatus,
    } = useInfiniteQuery({
        queryKey: ["startups", userId],
        initialPageParam: undefined,
        queryFn: async ({ pageParam = null }) => {
            const response = await axiosPrivate.get(`${BASE_URL}/api/startups/`, {
                params: { cursor: pageParam },
            })
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: !!userId,
    })

    const {
        data: discover,
        fetchNextPage: fetchDiscoverNext,
        hasNextPage: hasDiscoverNext,
        isFetchingNextPage: isFetchingDiscoverNext,
        status: discoverStatus,
    } = useInfiniteQuery({
        queryKey: ["startups-discover", { search, category }],
        initialPageParam: undefined,
        queryFn: async ({ pageParam = null }) => {
            // Use public axios; backend supports optional auth
            const response = await axios.get(`${BASE_URL}/api/startups/search`, {
                params: { cursor: pageParam, type: category, searchTerm: search },
            })
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        // Discover should work for guests too
        enabled: true,
    })

    const createStartup = useMutation({
        mutationFn: async (data) => {
            const { title, desc, keywords } = data
            const response = await axiosPrivate.post(`${BASE_URL}/api/startups/`, {
                title,
                description: desc,
                keywords,
            })
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["startups"])
            setShowCreate(false)
            setNewTitle("")
            setNewDesc("")
            setKeywords([])
        },
        onError: (err) => console.log(err),
    })

    const editStartup = useMutation({
        mutationFn: async ({ id, data }) => {
            const { title, desc, keywords } = data
            const response = await axiosPrivate.put(`${BASE_URL}/api/startups/${id}`, {
                title,
                description: desc,
                keywords,
            })
            return response.data
        },
        onSuccess: (data) => {
            console.log(data)

            // Update both query caches first using Immer
            const updateCache = (queryKey) => {
                queryClient.setQueryData(queryKey, (oldData) =>
                    produce(oldData, (draft) => {
                        if (!draft) return
                        draft.pages.forEach((page) => {
                            const itemIndex = page.data.findIndex((item) => item._id === data._id)
                            if (itemIndex !== -1) {
                                // Update only the edited fields while preserving existing data
                                const existingItem = page.data[itemIndex]
                                page.data[itemIndex] = {
                                    ...existingItem,
                                    title: data.title,
                                    description: data.description,
                                    keywords: data.keywords,
                                }
                            }
                        })
                    }),
                )
            }

            // Update both caches
            updateCache(["startups", userId])
            updateCache(["startups", userId, { search: "", category: "All" }])

            // Update modal item while preserving creator info
            setModalItem(
                produce((prev) => {
                    if (!prev) return null
                    prev.title = data.title
                    prev.description = data.description
                    prev.keywords = data.keywords
                    // Creator info is preserved automatically since we're not touching it
                    return prev
                }),
            )

            // Clear edit state and close modal
            setOriginalData(null)
            setHasChanges(false)
            setShowEdit(false)
        },
        onError: (err) => console.log(err),
    })

    const deleteStartup = useMutation({
        mutationFn: async (id) => {
            const response = await axiosPrivate.delete(`${BASE_URL}/api/startups/${id}`)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["startups"])
            setModalItem(null)
            setShowDeleteConfirm(false)
        },
        onError: (err) => console.log(err),
    })

    const handleKeywordKey = (e) => {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            const tag = keywordInput.trim()
            if (tag && tag.length <= 15 && keywords.length < 5 && !keywords.includes(tag)) {
                setKeywords([...keywords, tag])
                setKeywordInput("")
            }
        }
    }

    const handleKeywordInput = (e) => {
        const value = e.target.value
        if (value.length <= 15) {
            setKeywordInput(value)
        }
    }

    const removeKeyword = (tag) => setKeywords(keywords.filter((k) => k !== tag))

    const discoverSentinelRef = useRef(null)
    const yourJourneysSentinelRef = useRef(null)

    useEffect(() => {
        const el =
            tab === "Discover" ? discoverSentinelRef.current : yourJourneysSentinelRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0]
                if (!first.isIntersecting) return
                if (tab === "Discover") {
                    if (hasDiscoverNext && !isFetchingDiscoverNext) fetchDiscoverNext()
                } else {
                    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
                }
            },
            { root: null, rootMargin: "0px", threshold: 0.1 },
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [
        tab,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        hasDiscoverNext,
        isFetchingDiscoverNext,
        fetchDiscoverNext,
    ])

    return (
        <div className='page-wrapper startup-page'>
            <header style={styles.header}>
                <h1 className='page-title'>Startup Showcase</h1>
                <p className='page-subtitle'>Discover innovative startup ideas.</p>
                {/* Tabs */}
                <div style={styles.tabContainer}>
                    <div
                        style={{
                            ...styles.tab,
                            ...(tab === "Your Journeys" ? styles.tabActive : {}),
                        }}
                        onClick={() => setTab("Your Journeys")}
                    >
                        <FaMapMarkedAlt style={styles.tabIcon} /> Your Journeys
                    </div>
                    <div
                        style={{ ...styles.tab, ...(tab === "Discover" ? styles.tabActive : {}) }}
                        onClick={() => setTab("Discover")}
                    >
                        <FaCompass style={styles.tabIcon} /> Discover
                    </div>
                </div>
            </header>

            {tab === "Discover" && (
                <>
                    <div style={styles.discoverControls}>
                        <input
                            style={styles.searchInput}
                            placeholder='Search...'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                            style={styles.select}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {categories.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.cardList}>
                        {discover?.pages?.map((page) => {
                            return page?.data?.map((s) => {
                                return (
                                    <JourneyCard
                                        key={s._id}
                                        item={s}
                                        showActions={true}
                                        onClick={() => setModalItem(s)}
                                    />
                                )
                            })
                        })}
                        {/* Sentinel */}
                        <div
                            ref={discoverSentinelRef}
                            style={styles.infiniteSentinel}
                        />
                        {/* Bottom spinner */}
                        {isFetchingDiscoverNext && (
                            <div style={styles.bottomSpinnerWrap}>
                                <Spinner
                                    size={24}
                                    withStyles={false}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            {tab === "Your Journeys" && (
                <>
                    {/* Create above filters */}
                    <div style={styles.createWrap}>
                        <button
                            style={{
                                ...styles.createBtn,
                                ...(userId
                                    ? {}
                                    : { opacity: 0.6, cursor: "pointer", backgroundColor: "#555" }),
                            }}
                            onClick={() => {
                                if (!userId) {
                                    setOpenLoginModal(true)
                                    return
                                }
                                setShowCreate(true)
                            }}
                        >
                            Create Startup
                        </button>
                    </div>
                    {!userId && (
                        <div
                            onClick={() => setOpenLoginModal(true)}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                background: "#111",
                                border: "1px solid #333",
                                borderRadius: 12,
                                padding: "16px 20px",
                                width: "250px",
                                margin: "0 auto 12px",
                                cursor: "pointer",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                            }}
                        >
                            <FaLock
                                size={28}
                                color='#ff4444'
                                style={{ marginBottom: 4 }}
                            />
                            <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                                Login to create startups
                            </span>
                        </div>
                    )}
                    <div style={styles.cardList}>
                        {data?.pages?.map((page) => {
                            return page?.data?.map((s) => {
                                return (
                                    <JourneyCard
                                        key={s._id}
                                        item={s}
                                        showActions={false}
                                        onClick={() => setModalItem(s)}
                                    />
                                )
                            })
                        })}
                        {/* Sentinel */}
                        <div
                            ref={yourJourneysSentinelRef}
                            style={styles.infiniteSentinel}
                        />
                        {/* Bottom spinner */}
                        {isFetchingNextPage && (
                            <div style={styles.bottomSpinnerWrap}>
                                <Spinner
                                    size={24}
                                    withStyles={false}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* View modal */}
            <Modal
                open={!!modalItem}
                onClose={() => setModalItem(null)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Box sx={isMobile ? styles.modalBoxMobile : styles.modalBox}>
                    {modalItem && (
                        <div style={styles.modalContentEnhanced}>
                            <div style={styles.modalHeader}>
                                <div style={styles.modalHeaderContent}>
                                    <div style={styles.modalTitleSection}>
                                        <h2 style={styles.modalTitle}>{modalItem.title}</h2>
                                    </div>
                                    <button
                                        onClick={() => setModalItem(null)}
                                        style={styles.closeButton}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div style={styles.modalBody}>
                                {modalItem.creator?._id === userId ? (
                                    <div style={styles.modalActions}>
                                        <button
                                            onClick={() => {
                                                setNewTitle(modalItem.title)
                                                setNewDesc(modalItem.description)
                                                setKeywords(modalItem.keywords || [])
                                                setOriginalData({
                                                    _id: modalItem._id,
                                                    title: modalItem.title,
                                                    description: modalItem.description,
                                                    keywords: modalItem.keywords || [],
                                                })
                                                setShowEdit(true)
                                                setModalItem(null)
                                            }}
                                            style={styles.editButton}
                                        >
                                            Edit Startup
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            style={styles.deleteButton}
                                        >
                                            Delete Startup
                                        </button>
                                    </div>
                                ) : (
                                    <div style={styles.modalActions}>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                if (!userId) {
                                                    setOpenLoginModal(true)
                                                    return
                                                }
                                                return navigate("/chats", {
                                                    state: {
                                                        targetUserInfo: modalItem?.creator,
                                                    },
                                                })
                                            }}
                                            style={styles.modalInquireBtn}
                                        >
                                            Inquire About Startup
                                        </button>
                                    </div>
                                )}

                                <div style={styles.sectionWithLabel}>
                                    <label style={styles.sectionLabel}>
                                        <FaUserAlt style={styles.labelIcon} />
                                        <span
                                            style={{
                                                marginLeft: 10,
                                                display: "inline-block",
                                                transform: "translateY(2px)",
                                            }}
                                        >
                                            Creator
                                        </span>
                                    </label>
                                    <div style={styles.creatorInfo}>
                                        <p style={styles.modalUser}>
                                            {modalItem.creator?.username}
                                        </p>
                                        {modalItem.creator?.location && (
                                            <span style={styles.modalLocation}>
                                                <FaMapMarkerAlt style={styles.inlineIcon} />
                                                {modalItem.creator.location}
                                            </span>
                                        )}
                                        {modalItem.creator?.completedJourneys > 0 && (
                                            <div style={styles.completedJourneysBadge}>
                                                <FaTrophy style={styles.inlineIcon} />
                                                <span style={styles.badgeText}>
                                                    {modalItem.creator.completedJourneys} Completed
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={styles.sectionWithLabel}>
                                    <label style={styles.sectionLabel}>
                                        <FaAlignLeft style={styles.labelIcon} />
                                        <span
                                            style={{
                                                marginLeft: 10,
                                                display: "inline-block",
                                                transform: "translateY(2px)",
                                            }}
                                        >
                                            Description
                                        </span>
                                    </label>
                                    <p style={styles.modalDescription}>{modalItem.description}</p>
                                </div>

                                <div style={styles.sectionWithLabel}>
                                    <label style={styles.sectionLabel}>
                                        <FaTags style={styles.labelIcon} />
                                        <span
                                            style={{
                                                marginLeft: 10,
                                                display: "inline-block",
                                                transform: "translateY(2px)",
                                            }}
                                        >
                                            Keywords
                                        </span>
                                    </label>
                                    <div style={styles.modalKeywords}>
                                        {modalItem?.keywords?.map((k) => (
                                            <span
                                                key={k}
                                                style={styles.keywordPill}
                                            >
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Box>
            </Modal>

            {/* Delete confirmation modal */}
            <Modal
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Box sx={styles.deleteConfirmBox}>
                    <div style={styles.deleteConfirmContent}>
                        <h3 style={styles.deleteConfirmTitle}>Delete Startup?</h3>
                        <p style={styles.deleteConfirmText}>
                            Are you sure you want to delete this startup? This action cannot be
                            undone.
                        </p>
                        <div style={styles.deleteConfirmActions}>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                }}
                                style={styles.cancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteStartup.mutate(modalItem._id)
                                }}
                                style={styles.confirmDeleteButton}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </Box>
            </Modal>

            {/* Create/Edit modal */}
            <Modal
                open={showCreate || showEdit}
                onClose={() => {
                    if (showCreate) setShowCreate(false)
                    if (showEdit) {
                        setShowEdit(false)
                        setOriginalData(null)
                        setHasChanges(false)
                    }
                    setNewTitle("")
                    setNewDesc("")
                    setKeywords([])
                }}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Box sx={isMobile ? styles.modalBoxMobile : styles.modalBox}>
                    <div style={styles.modalContentEnhanced}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                {showEdit ? "Edit Startup" : "Create Startup"}
                            </h2>
                            <button
                                onClick={() => {
                                    if (!newTitle.length || !newDesc.length) return
                                    if (showEdit) {
                                        editStartup.mutate({
                                            id: originalData._id,
                                            data: {
                                                title: newTitle,
                                                desc: newDesc,
                                                keywords,
                                            },
                                        })
                                    } else {
                                        createStartup.mutate({
                                            title: newTitle,
                                            desc: newDesc,
                                            keywords,
                                        })
                                    }
                                }}
                                style={{
                                    ...styles.createButton,
                                    ...(showEdit && !hasChanges ? styles.editButtonDisabled : {}),
                                    ...(showEdit && hasChanges ? styles.editButtonChanged : {}),
                                }}
                                disabled={
                                    !newTitle.length || !newDesc.length || (showEdit && !hasChanges)
                                }
                            >
                                {showEdit
                                    ? hasChanges
                                        ? "Save Changes"
                                        : "No Changes"
                                    : "Create Startup"}
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>
                                    <FaLightbulb style={styles.inputIcon} />
                                    Startup Title
                                </label>
                                <input
                                    type='text'
                                    placeholder='Enter a catchy title for your startup'
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    style={styles.fullInput}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>
                                    <FaAlignLeft style={styles.inputIcon} />
                                    Description
                                </label>
                                <textarea
                                    placeholder='Describe your startup idea in detail'
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    style={styles.fullTextarea}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>
                                    <FaTags style={styles.inputIcon} />
                                    Keywords (up to 5)
                                </label>
                                <div style={styles.keywordsInputContainer}>
                                    <div style={styles.keywordsList}>
                                        {keywords.map((k) => (
                                            <div
                                                key={k}
                                                style={styles.keywordTag}
                                            >
                                                {k}
                                                <span
                                                    style={styles.removeKeyword}
                                                    onClick={() => removeKeyword(k)}
                                                >
                                                    ×
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {keywords.length < 5 && (
                                        <input
                                            id='keyword-input'
                                            type='text'
                                            placeholder='Type keyword (max 15 chars) and press space/enter'
                                            value={keywordInput}
                                            onChange={handleKeywordInput}
                                            onKeyDown={handleKeywordKey}
                                            style={styles.keywordInputField}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Box>
            </Modal>
            <UnauthorizedLoginPopupModal
                isOpen={openLoginModal}
                onClose={() => setOpenLoginModal(false)}
            />
        </div>
    )
}

// Reusable card component
const JourneyCard = ({ item, showActions, onClick }) => {
    const navigate = useNavigate()
    const userId = useSelector((state) => state.auth.userData?._id)
    const [openLoginModal, setOpenLoginModal] = useState(false)

    return (
        <div style={styles.card}>
            <div
                style={{ width: "100%", height: "100%" }}
                onClick={onClick}
            >
                <h3 style={styles.cardTitle}>{item.title}</h3>
                <p style={styles.cardUser}>by {item.creator?.username}</p>
                {item.creator?.location && (
                    <span style={styles.bio}>📍 {item.creator.location}</span>
                )}
                {item.creator?.completedJourneys !== null &&
                    item.creator?.completedJourneys !== undefined && (
                        <div style={styles.completedJourneysBadge}>
                            <span style={styles.badgeIcon}>🏆</span>
                            <span style={styles.badgeText}>
                                {item.creator.completedJourneys} Completed
                            </span>
                        </div>
                    )}
                <p style={styles.cardCaption}>{item.description}</p>
                <ul style={styles.requirements}>
                    {item.keywords?.map((k) => (
                        <li
                            key={k}
                            style={styles.keywordPill}
                        >
                            {k}
                        </li>
                    ))}
                </ul>
            </div>
            {showActions && (
                <div style={styles.cardActions}>
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            if (!userId) {
                                setOpenLoginModal(true)
                                return
                            }
                            return navigate("/chats", {
                                state: { targetUserInfo: item?.creator },
                                replace: true,
                            })
                        }}
                        style={styles.msgBtn}
                    >
                        Inquire
                    </button>
                </div>
            )}
            <UnauthorizedLoginPopupModal
                isOpen={openLoginModal}
                onClose={() => setOpenLoginModal(false)}
            />
        </div>
    )
}

const styles = {
    container: {
        backgroundColor: "black",
        marginTop: 100,
        color: "#eee",
        minHeight: "100vh",
        padding: "16px",
        fontFamily: "Arial, sans-serif",
    },
    sectionLabel: { color: "#ccc", margin: "12px 0 4px", fontWeight: "bold" },

    header: { textAlign: "center", marginBottom: "24px" },
    title: { fontSize: "2rem", margin: 0 },
    subtitle: { color: "#aaa" },
    createWrap: { display: "flex", justifyContent: "center", marginBottom: 20 },
    createBtn: {
        padding: "8px 16px",
        backgroundColor: "#0079d3",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
    },

    controls: {
        display: "flex",
        gap: "12px",
        marginBottom: "16px",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
    },
    searchInput: {
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #444",
        backgroundColor: "var(--darkGrey3)",
        color: "#eee",
        width: "550px",
    },
    select: {
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #444",
        backgroundColor: "var(--darkGrey3)",
        color: "#eee",
    },
    infiniteSentinel: {
        width: "100%",
        height: 1,
    },
    bottomSpinnerWrap: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px 0",
    },

    cardList: {
        display: "grid",
        // Keep cards from stretching too wide when there is only one
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 420px))",
        gap: "20px",
        // Add horizontal padding as requested
        padding: "12px 16px",
        // Center the grid so single cards sit nicely in the middle
        justifyContent: "center",
    },
    card: {
        backgroundColor: "#1a1a1a",
        borderRadius: "12px",
        padding: "24px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        transition: "border-color 0.2s, box-shadow 0.2s",
        border: "1px solid #333",
        "&:hover": {
            borderColor: "#444",
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        },
    },
    cardTitle: {
        margin: "0 0 12px",
        fontSize: "1.4rem",
        fontWeight: 600,
        color: "#fff",
        letterSpacing: "0.02em",
    },
    cardUser: {
        margin: "0 0 8px",
        color: "#888",
        fontWeight: 500,
        fontSize: "0.95rem",
        letterSpacing: "0.01em",
    },
    bio: {
        color: "#aaa",
        fontSize: "14px",
        marginTop: 2,
        marginBottom: 6,
        display: "block",
    },
    completedJourneysBadge: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 4,
        padding: "4px 8px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 12,
        fontSize: "12px",
        minHeight: "24px",
        width: "fit-content",
        marginBottom: 10,
    },
    badgeIcon: {
        fontSize: "14px",
        width: "14px",
        height: "14px",
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
    completedJourneysBadge: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "4px 8px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 12,
        fontSize: "12px",
        minHeight: "24px",
    },
    badgeIcon: {
        fontSize: "14px",
        width: "14px",
        height: "14px",
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
    locationText: {
        color: "#aaa",
        fontSize: "14px",
        marginBottom: 10,
        display: "block",
    },
    cardCaption: {
        margin: "0 0 16px",
        color: "#e0e0e0",
        fontSize: "1rem",
        lineHeight: 1.6,
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontWeight: 400,
    },
    requirements: {
        listStyle: "none",
        paddingLeft: 0,
        margin: "0 0 12px",
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
    },
    keywordPill: {
        background: "#2d2d2d",
        color: "#0079d3",
        borderRadius: "6px",
        padding: "4px 12px",
        fontSize: "0.9rem",
        fontWeight: 500,
        border: "1px solid #404040",
    },
    cardActions: { display: "flex", gap: "8px", marginTop: "auto" },
    tabContainer: { display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px" },
    tab: { padding: "8px 16px", cursor: "pointer", color: "#777" },
    tabActive: { color: "#fff", borderBottom: "2px solid #fff" },
    tabIcon: { fontSize: 16 },
    discoverControls: {
        display: "flex",
        gap: "12px",
        marginBottom: "16px",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
    },
    msgBtn: {
        flex: 1,
        padding: "6px",
        border: "1px solid #0079d3",
        backgroundColor: "transparent",
        color: "#0079d3",
        borderRadius: "4px",
    },
    inviteBtn: {
        flex: 1,
        padding: "6px",
        border: "1px solid #46d160",
        backgroundColor: "transparent",
        color: "#46d160",
        borderRadius: "4px",
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
    },
    createButton: {
        backgroundColor: "transparent",
        color: "#0079d3",
        border: "none",
        padding: "4px 0",
        fontSize: "1rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
        "&:disabled": {
            color: "#666",
            cursor: "not-allowed",
        },
    },
    editButtonDisabled: {
        color: "#666",
        cursor: "not-allowed",
    },
    editButtonChanged: {
        color: "#ff4444",
    },
    modalTitle: {
        margin: "0 0 8px 0",
        fontSize: "1.4rem",
        fontWeight: 600,
        color: "#fff",
        letterSpacing: "0.01em",
    },
    modalCaption: {
        marginBottom: "24px",
        color: "#f1f2f6",
        fontSize: "1.1rem",
        lineHeight: 1.7,
    },
    modal: {
        padding: "32px",
        minHeight: "200px",
        maxHeight: "80vh",
        overflow: "auto",
        background: "linear-gradient(135deg, #232526 0%, #414345 100%)",
        borderRadius: "24px",
        boxShadow: "0 8px 32px 0 rgba(0,0,0,0.24)",
        border: "1.5px solid #232526",
    },
    smallInput: {
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #444",
        backgroundColor: "var(--darkGrey3)",
        color: "#eee",
        width: "60%",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginBottom: "24px",
        marginLeft: "12px",
    },
    inputLabel: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        color: "#aaa",
        fontSize: "0.95rem",
        fontWeight: 500,
        lineHeight: "1",
        height: "24px",
    },
    inputIcon: {
        width: "16px",
        height: "16px",
        color: "#0079d3",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    fullInput: {
        width: "100%",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #444",
        backgroundColor: "#2a2a2a",
        color: "#fff",
        fontSize: "0.95rem",
    },
    fullTextarea: {
        width: "100%",
        minHeight: "120px",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #444",
        backgroundColor: "#2a2a2a",
        color: "#fff",
        fontSize: "0.95rem",
        resize: "vertical",
    },
    textareaCreate: {
        width: "100%",
        minHeight: "80px",
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #444",
        backgroundColor: "var(--darkGrey3)",
        color: "#eee",
        resize: "none",
        margin: "12px 0",
    },
    reqContainer: { display: "flex", gap: "8px", alignItems: "center" },
    addReqBtn: {
        padding: "6px",
        backgroundColor: "#0079d3",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
    },
    newReqList: { listStyle: "none", padding: 0, margin: "12px 0" },
    newReqItem: {
        backgroundColor: "var(--darkGrey3)",
        padding: "4px 8px",
        borderRadius: "4px",
        marginBottom: "4px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    removeReqBtn: {
        background: "transparent",
        border: "none",
        color: "#ff4444",
        cursor: "pointer",
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
    modal: {
        padding: "32px",
        minHeight: "200px",
        maxHeight: "80vh",
        overflow: "auto",
        backgroundColor: "#1a1a1a",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        border: "1px solid #333",
    },
    keywordsInputContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        border: "1px solid #444",
        borderRadius: "8px",
        backgroundColor: "#2a2a2a",
        minHeight: "40px",
    },
    keywordsList: {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
    },
    keywordTag: {
        display: "flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: "6px",
        backgroundColor: "#0079d3",
        color: "#fff",
        fontSize: "0.9rem",
    },
    removeKeyword: {
        marginLeft: "6px",
        cursor: "pointer",
        fontSize: "1.1rem",
        opacity: 0.8,
    },
    keywordInputField: {
        width: "100%",
        border: "none",
        outline: "none",
        padding: "4px 0",
        background: "transparent",
        color: "#fff",
        fontSize: "0.95rem",
    },
    modalBox: {
        backgroundColor: "#1a1a1a",
        width: "90%",
        maxWidth: "550px",
        borderRadius: "12px",
        border: "1px solid #333",
        maxHeight: "85vh",
        outline: "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    modalBoxMobile: {
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a1a",
        outline: "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    modalContentEnhanced: {
        padding: "16px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "0 0 12px 0",
        marginBottom: "12px",
        borderBottom: "1px solid #333",
        backgroundColor: "#1a1a1a",
        position: "sticky",
        top: 0,
        zIndex: 1,
    },
    modalBody: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        overflowY: "auto",
    },
    modalTitle: {
        margin: 0,
        color: "#fff",
        fontSize: "1.3rem",
        fontWeight: 600,
        paddingRight: "32px",
    },
    closeButton: {
        position: "absolute",
        top: 0,
        right: 0,
        background: "none",
        border: "none",
        color: "#888",
        fontSize: "24px",
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    creatorInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    modalUser: {
        margin: 0,
        color: "#888",
        fontSize: "0.95rem",
    },
    modalLocation: {
        color: "#aaa",
        fontSize: "0.9rem",
        display: "flex",
        alignItems: "center",
        gap: "4px",
    },
    completedJourneysBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        border: "1px solid #333",
        borderRadius: "8px",
        fontSize: "0.9rem",
        height: "32px",
        width: "fit-content",
    },
    modalContent: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "4px",
    },
    modalDescription: {
        color: "#e0e0e0",
        fontSize: "0.95rem",
        lineHeight: 1.6,
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxWidth: "100%",
    },
    modalKeywords: {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
    },
    modalActions: {
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: "4px",
    },
    modalInquireBtn: {
        backgroundColor: "#0079d3",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "0.95rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background-color 0.2s",
        marginTop: "8px",
    },
    editButton: {
        backgroundColor: "#2d2d2d",
        color: "#fff",
        border: "1px solid #444",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "0.95rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
        marginRight: "8px",
    },
    deleteButton: {
        backgroundColor: "transparent",
        color: "#ff4444",
        border: "1px solid #ff4444",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "0.95rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
    },
    deleteConfirmBox: {
        width: "90%",
        maxWidth: "400px",
        backgroundColor: "#1a1a1a",
        borderRadius: "12px",
        border: "1px solid #333",
        outline: "none",
    },
    deleteConfirmContent: {
        padding: "24px",
    },
    deleteConfirmTitle: {
        color: "#fff",
        fontSize: "1.2rem",
        marginTop: 0,
        marginBottom: "16px",
    },
    deleteConfirmText: {
        color: "#aaa",
        fontSize: "0.95rem",
        margin: "0 0 24px 0",
    },
    deleteConfirmActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
    },
    cancelButton: {
        backgroundColor: "transparent",
        color: "#888",
        border: "1px solid #444",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "0.95rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
    },
    confirmDeleteButton: {
        backgroundColor: "#ff4444",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "0.95rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
    },
}
