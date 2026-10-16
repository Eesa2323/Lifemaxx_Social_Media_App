import React, { useState, useEffect } from "react"
import Button from "../components/Button"
import Modal from "../components/Modal"
import { useMediaQuery } from "react-responsive"
import Skeleton from "../components/Skeleton"
import { useInView } from "react-intersection-observer"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { BASE_URL } from "../utils/config"
import { useSelector } from "react-redux"
import Input from "../components/Input"

const AVAILABLE_TAGS = ["Looksmaxxing", "Business", "Fitness", "Self-improvement", "Other"]

const JourneysPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTags, setSelectedTags] = useState([])
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const navigate = useNavigate()
    const { ref, inView } = useInView()
    const userId = useSelector((state) => state.auth?.userData?._id)

    const journeys = useInfiniteQuery({
        queryKey: ["journeys"],
        initialPageParam: undefined,
        queryFn: async ({ pageParam = null }) => {
            const response = await axiosPrivate.get(`${BASE_URL}/api/journeys`, {
                params: { cursor: pageParam, id: userId },
            })
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: Infinity,
        enabled: !!userId,
    })

    const createJourney = useMutation({
        mutationFn: async (journeyData) => {
            const response = await axiosPrivate.post(`${BASE_URL}/api/journeys/`, journeyData)
            return response.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["journeys"], (oldData) => {
                if (!oldData) return oldData

                const newData = { ...oldData }
                if (newData.pages[0]) {
                    newData.pages[0] = {
                        ...newData.pages[0],
                        data: [data.journey, ...newData.pages[0].data],
                    }
                }
                return newData
            })

            resetState()
        },
    })

    useEffect(() => {
        if (inView && journeys.hasNextPage && !journeys.isFetchingNextPage) journeys.fetchNextPage()
    }, [inView, journeys])

    const resetState = () => {
        setIsModalOpen(false)
        setTitle("")
        setDescription("")
        setSelectedTags([])
    }

    const handleCreateJourney = async (e) => {
        e.preventDefault()

        createJourney.mutate({
            title,
            description,
            tags: selectedTags,
        })
    }

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag))
        } else if (selectedTags.length < 12) {
            setSelectedTags([...selectedTags, tag])
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Your Journeys</h1>
                <Button onClick={() => setIsModalOpen(true)}>Create Journey</Button>
            </div>

            <div style={styles.journeyList}>
                {journeys.isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <Skeleton
                            key={i}
                            variant='card'
                            style={styles.skeletonCard}
                        />
                    ))
                ) : journeys.isError ? (
                    <div style={styles.errorMessage}>
                        Error loading journeys. Please try again later.
                    </div>
                ) : (
                    <>
                        {journeys.data?.pages.map((page) =>
                            page.data.map((journey) => (
                                <div
                                    key={journey._id}
                                    style={styles.journeyCard}
                                    onClick={() =>
                                        navigate(`/journeys/${journey._id}`, {
                                            state: { journey },
                                        })
                                    }
                                >
                                    <h3 style={styles.journeyTitle}>{journey.title}</h3>
                                    <p style={styles.journeyDescription}>{journey.description}</p>
                                    <div style={styles.tagContainer}>
                                        {journey.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                style={styles.tag}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={ref}>
                            {journeys.isFetchingNextPage && (
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
                    </>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => !createJourney.isPending && setIsModalOpen(false)}
                fullScreen={isMobile}
            >
                <div style={styles.modalContent}>
                    <h2 style={styles.modalTitle}>Create New Journey</h2>
                    <form
                        onSubmit={handleCreateJourney}
                        style={styles.form}
                    >
                        <div style={styles.formContent}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Title</label>
                                <input
                                    type='text'
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    style={styles.input}
                                    placeholder='Enter journey title'
                                    required
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    style={styles.textarea}
                                    placeholder='Describe your journey'
                                    required
                                    rows={4}
                                />
                            </div>
                            <div style={styles.tagsSection}>
                                <label style={styles.label}>Tags ({selectedTags.length}/12)</label>
                                <div style={styles.tagsGrid}>
                                    {AVAILABLE_TAGS.map((tag) => (
                                        <div
                                            key={tag}
                                            style={{
                                                ...styles.selectableTag,
                                                ...(selectedTags.includes(tag)
                                                    ? styles.selectedTag
                                                    : {}),
                                            }}
                                            onClick={() => toggleTag(tag)}
                                        >
                                            {tag}
                                        </div>
                                    ))}
                                </div>
                                {selectedTags.length > 0 && (
                                    <div style={styles.selectedTagsContainer}>
                                        {selectedTags.map((tag) => (
                                            <div
                                                key={tag}
                                                style={styles.selectedTagChip}
                                                onClick={() => toggleTag(tag)}
                                            >
                                                {tag}
                                                <span style={styles.removeTag}>×</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={styles.submitSection}>
                            <Button
                                type='submit'
                                style={styles.submitButton}
                                disabled={createJourney.isPending}
                            >
                                {createJourney.isPending ? "Creating..." : "Create Journey"}
                            </Button>
                            {createJourney.isError && (
                                <div style={styles.errorMessage}>
                                    {createJourney.error?.response?.data?.message ||
                                        "Failed to create journey. Please try again."}
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </Modal>
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
        marginBottom: "2rem",
        "@media (min-width: 768px)": {
            gap: "1.25rem",
            marginBottom: "2.5rem",
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

export default JourneysPage
