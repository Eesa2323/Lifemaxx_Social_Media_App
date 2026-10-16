import React, { useRef, useState, useEffect } from "react"
import { Modal as MUIModal } from "@mui/material"
import { useMediaQuery } from "react-responsive"
import { useParams, useLocation, Navigate, useNavigate } from "react-router-dom"
import Skeleton from "../components/Skeleton"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import axios from "axios"
import Cropper from "react-easy-crop"
import getCroppedImg from "../utils/cropImage"
import { useSelector } from "react-redux"
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai"
import { produce } from "immer"
import PostComments from "../components/PostComments"
import Like from "../components/Like"
import JourneyPost from "../components/JourneyPost"
import useMentionAutocomplete from "../hooks/useMentionAutocomplete"
import MentionAutocomplete from "../components/MentionAutocomplete"
import ThreeDotsMenu from "../components/ThreeDotsMenu"
import { formatNotificationDate as formatDate } from "../utils/format"
import ProfilePic from "../components/ProfilePic"
const getStyles = (isMobile) => ({
    container: {
        padding: isMobile ? "1rem" : "2rem",
        maxWidth: "1200px",
        margin: isMobile ? "10px auto 0 auto" : "80px auto 0 auto",
        width: "100%",
    },
    createSection: {
        marginBottom: "2.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        backgroundColor: "#1a1a1a",
        padding: isMobile ? "1.5rem" : "2rem",
        borderRadius: "1rem",
        border: "1px solid #333",
    },
    cropperContainer: {
        flex: 1,
        backgroundColor: "#000",
        position: "relative",
        minHeight: isMobile ? "0" : "500px",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    cropperWrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        margin: "0 auto",
    },
    cropperContent: {
        position: "relative",
        width: "100%",
        height: "100%",
    },
    cropperStyle: {
        containerStyle: {
            width: "100%",
            height: "100%",
            backgroundColor: "#000",
        },
        mediaStyle: {
            width: "100%",
            height: "100%",
            objectFit: "contain",
        },
    },
    cropperCloseButton: {
        position: "absolute",
        right: 6,
        top: 6,
        background: "rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.85)",
        fontSize: "1.5rem",
        fontWeight: 400,
        color: "#fff",
        cursor: "pointer",
        padding: 0,
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        margin: 5,
        borderRadius: "50%",
        transition: "background-color 0.2s",
        zIndex: 10,
    },
    uploadPrompt: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        cursor: "pointer",
        padding: "20px",
    },
    uploadIcon: {
        width: "80px",
        height: "80px",
        color: "#666",
        marginBottom: "12px",
    },
    uploadText: {
        color: "#666",
        fontSize: "16px",
        margin: 0,
    },
    hiddenInput: {
        display: "none",
    },
    previewContainerDesktop: {
        width: "50%",
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "500px",
    },
    previewContainerMobile: {
        height: "auto",
        width: "90%",
        maxHeight: "50vh",
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 0",
        marginTop: "20px",
    },
    previewImage: {
        maxWidth: "100%",
        maxHeight: isMobile ? "40vh" : "100%",
        objectFit: "contain",
    },
    inputContainer: {
        flex: "1 1 auto",
        display: "flex",
        flexDirection: "column",
        width: "100%",
    },
    textarea: {
        flex: "1 1 auto",
        padding: "12px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "14px",
        height: "100%",
        resize: "none",
        marginBottom: "16px",
    },
    submitButton: {
        width: "100%",
        backgroundColor: "#0095f6",
    },
    errorMessage: {
        color: "#ff4444",
        fontSize: "14px",
        marginBottom: "16px",
        textAlign: "center",
    },
    // Create Post Modal (Step 0)
    modalStep1: {
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "100vh" : "auto",
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "20px 12px" : "13px 12px",
        borderBottom: "1px solid #333",
        marginBottom: 0,
    },
    modalTitle: {
        margin: isMobile ? 15 : 0,
        color: "#fff",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        fontSize: isMobile ? "1rem" : "1.125rem",
        marginTop: isMobile ? 4 : 0,
        marginBottom: isMobile ? 2 : 0,
    },
    nextTextLink: {
        color: "#0095f6",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        padding: isMobile ? "4px 6px" : "6px 8px",
        borderRadius: 6,
        userSelect: "none",
        position: "absolute",
        top: 7,
        right: 20,
    },
    journeyHeader: {
        marginBottom: "2.5rem",
        backgroundColor: "#1a1a1a",
        padding: isMobile ? "28px 20px 10px 20px" : "24px 20px 10px 20px",
        borderRadius: "1rem",
        border: "1px solid #333",
        position: "relative",
    },
    headerActions: {
        position: "absolute",
        top: "6px",
        right: "23px",
        display: "flex",
    },
    topRightActionsRow: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "1rem",
    },
    topLeftActionsRow: {
        position: "absolute",
        top: "6px",
        left: "20px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "1rem",
        zIndex: 2,
    },
    headerActionsLeft: {
        position: "absolute",
        top: "6px",
        left: "20px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "1rem",
        zIndex: 2,
    },
    headerUserBottomRight: {
        position: "absolute",
        bottom: "-2px",
        right: "20px",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    creatorInfo: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        height: "32px",
        minWidth: 0,
    },
    profilePic: {},
    profileImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    username: {
        color: "#999",
        fontSize: "0.875rem",
        fontWeight: "500",
        display: "inline-block",
        maxWidth: isMobile ? "60vw" : "280px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    actionLinks: {
        display: "flex",
        gap: "1rem",
        alignItems: "center",
        height: "32px",
    },
    actionLink: {
        color: "#999",
        fontSize: "0.75rem",
        cursor: "pointer",
        transition: "color 0.2s",
        "&:hover": {
            color: "#fff",
        },
    },
    actionItem: {
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        color: "#999",
        fontSize: "0.75rem",
        cursor: "pointer",
        transition: "color 0.2s",
        "&:hover": {
            color: "#fff",
        },
    },
    completeLink: {
        color: "#ff4444",
        "&:hover": {
            color: "#ff6666",
        },
    },
    journeyContent: {
        // Let text use more width while keeping a small gutter on desktop
        paddingRight: isMobile ? "0px" : "80px",
    },
    journeyTitle: {
        fontSize: "22px",
        fontWeight: "bold",
        marginBottom: "0.75rem",
        color: "#fff",
        letterSpacing: "-0.02em",
    },
    journeyDescription: {
        fontSize: isMobile ? "0.9375rem" : "1rem",
        color: "#999",
        marginTop: 10,
        lineHeight: "1.6",
        maxHeight: "120px",
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "#333 #1a1a1a",
    },
    journeyMeta: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
    },
    mobileActionsRow: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginTop: 10,
    },
    tagsContainer: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 15,
    },
    tag: {
        backgroundColor: "#333",
        color: "#fff",
        padding: "4px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
    },
    statusBadge: (isComplete) => ({
        padding: "0.5rem 1rem",
        borderRadius: "2rem",
        fontSize: "0.875rem",
        backgroundColor: isComplete ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
        color: isComplete ? "#10B981" : "#F59E0B",
        border: `1px solid ${isComplete ? "#10B981" : "#F59E0B"}`,
        fontWeight: "500",
        marginTop: isMobile ? 10 : 0,
    }),
    journeyDate: {
        color: "#999",
        fontSize: "0.875rem",
        fontWeight: "400",
        marginTop: isMobile ? 10 : 0,
    },
    completeButton: {
        backgroundColor: "#ff4444",
        color: "#fff",
        border: "none",
        padding: "0.5rem 1rem",
        borderRadius: "2rem",
        fontSize: "0.875rem",
        fontWeight: "500",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "#ff3333",
        },
    },
    postsTitle: {
        fontSize: isMobile ? "1.25rem" : "1.5rem",
        fontWeight: "600",
        marginBottom: "1.5rem",
        color: "#fff",
    },
    postsGrid: {
        display: "grid",
        gap: "1.5rem",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(600px, 1fr))",
    },
    postCard: {
        display: "flex",
        backgroundColor: "#1a1a1a",
        borderRadius: "1rem",
        overflow: "hidden",
        height: "160px",
        border: "1px solid #333",
        transition: "transform 0.2s, border-color 0.2s",
        "&:hover": {
            transform: "translateY(-2px)",
            borderColor: "#444",
        },
    },
    postImageContainer: {
        width: "160px",
        flexShrink: 0,
        backgroundColor: "#111",
    },
    postImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    postContent: {
        flex: 1,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    },
    postCaption: {
        color: "#fff",
        fontSize: "0.9375rem",
        marginBottom: "0.75rem",
        lineHeight: "1.5",
    },
    postActions: {
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
    },
    actionGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    actionButton: {
        background: "none",
        border: "none",
        padding: "0.5rem",
        cursor: "pointer",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
        "&:disabled": {
            opacity: 0.5,
            cursor: "not-allowed",
        },
    },
    actionCount: {
        color: "#999",
        fontSize: "0.875rem",
        fontWeight: "500",
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: isMobile ? "2rem 1rem" : "3rem 1.5rem",
        marginTop: isMobile ? "1.25rem" : "2rem",
        backgroundColor: "#0a0a0a",
        borderRadius: "16px",
        border: "1px solid #1a1a1a",
        maxWidth: "500px",
        marginLeft: "auto",
        marginRight: "auto",
    },
    emptyStateIcon: {
        marginBottom: isMobile ? "1rem" : "1.5rem",
        opacity: 0.7,
    },
    emptyStateTitle: {
        color: "#fff",
        fontSize: isMobile ? "1.25rem" : "1.5rem",
        fontWeight: 600,
        margin: "0 0 1rem 0",
        letterSpacing: "-0.02em",
    },
    emptyStateDescription: {
        color: "#999",
        fontSize: isMobile ? "0.9375rem" : "1rem",
        lineHeight: 1.6,
        margin: 0,
        maxWidth: "420px",
    },
})

const JourneyViewer = () => {
    const [postContent, setPostContent] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [imageSrc, setImageSrc] = useState(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [step, setStep] = useState(0)
    const [croppedImage, setCroppedImage] = useState(null)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const { id } = useParams()
    const location = useLocation()
    const journeyState = location.state?.journey
    const fileInputRef = useRef(null)
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const styles = getStyles(isMobile)
    const userData = useSelector((state) => state.auth.userData)
    const [selectedPost, setSelectedPost] = useState(null)
    const [isCommentsOpen, setIsCommentsOpen] = useState(false)
    const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null)
    const videoUrlRef = useRef(null)
    const mentionInputRef = useRef(null)
    const [isInfoOpen, setIsInfoOpen] = useState(false)

    // Mention autocomplete
    const {
        showMentionPopup,
        mentionSearchTerm,
        mentionPosition,
        handleInputChange: handleMentionInputChange,
        handleMentionSelect,
        closeMentionPopup,
    } = useMentionAutocomplete((newValue) => setPostContent(newValue), mentionInputRef)
    const [inViewMap, setInViewMap] = useState({})
    const containerRefs = useRef([])
    const intersectionRatiosRef = useRef({})
    const debounceTimeoutRef = useRef(null)
    const lastMaxIdRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => {
        if (!id) return
        const resetState = () => {
            return navigate(`/journeys/${id}`, { replace: true }, { state: null })
        }

        window.addEventListener("beforeunload", resetState)

        return () => window.removeEventListener("beforeunload", resetState)
    }, [navigate, id])

    // Keep a stable object URL for video preview
    useEffect(() => {
        if (selectedFile && selectedFile.type && selectedFile.type.startsWith("video/")) {
            if (videoUrlRef.current) {
                URL.revokeObjectURL(videoUrlRef.current)
            }
            videoUrlRef.current = URL.createObjectURL(selectedFile)
        } else {
            if (videoUrlRef.current) {
                URL.revokeObjectURL(videoUrlRef.current)
                videoUrlRef.current = null
            }
        }
        return () => {
            if (videoUrlRef.current) {
                URL.revokeObjectURL(videoUrlRef.current)
                videoUrlRef.current = null
            }
        }
    }, [selectedFile])

    const journey = useQuery({
        queryKey: ["journey", id],
        queryFn: async () => {
            const response = await axios.get(`${BASE_URL}/api/journeys/${id}`)
            return response.data
        },
        initialData: journeyState,
        staleTime: Infinity,
        enabled: !!id,
    })

    const posts = useInfiniteQuery({
        queryKey: ["journeyPosts", id],
        initialPageParam: undefined,
        queryFn: async ({ pageParam = null }) => {
            const response = await axiosPrivate.get(`${BASE_URL}/api/posts/`, {
                params: { cursor: pageParam, id },
            })
            return response.data
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: Infinity,
        enabled: !!id && !journey.isFetching,
    })

    const createPost = useMutation({
        mutationFn: async () => {
            let file = selectedFile

            if (croppedImage) {
                const response = await fetch(croppedImage)
                const blob = await response.blob()
                file = new File([blob], selectedFile.name, { type: selectedFile.type })
            }

            const formData = new FormData()
            file && formData.append("file", file)
            formData.append("journeyid", id)
            postContent && formData.append("caption", postContent)

            const result = await axiosPrivate.post(`${BASE_URL}/api/posts/`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })
            return result.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["journeyPosts", id], (oldData) => {
                return produce(oldData, (draft) => {
                    // Make sure the post includes creator data before adding to cache
                    const postWithCreator = {
                        ...data.post,
                        creator: userData, // Use creator from API or fallback to current user data
                    }

                    if (!oldData) return
                    else if (!draft.pages.length)
                        draft.pages.unshift({ data: [postWithCreator], nextCursor: null })
                    else draft.pages[0].data.unshift(postWithCreator)
                })
            })
            resetState()
        },
        onError: (error) => {
            console.log(error.response.data)
        },
    })

    const markComplete = useMutation({
        mutationFn: async () => {
            const response = await axiosPrivate.put(`${BASE_URL}/api/journeys/mark_complete/${id}`)
            return response.data
        },
        onSuccess: (data) => {
            console.log(data)
            queryClient.setQueryData(["journey", id], (oldData) => {
                if (!oldData) return oldData
                return { ...oldData, status: true }
            })
        },
    })

    const markIncomplete = useMutation({
        mutationFn: async () => {
            const response = await axiosPrivate.put(
                `${BASE_URL}/api/journeys/mark_incomplete/${id}`,
            )
            return response.data
        },
        onSuccess: () => {
            queryClient.setQueryData(["journey", id], (oldData) => {
                if (!oldData) return oldData
                return { ...oldData, status: false }
            })
        },
        onError: (err, _vars, context) => {
            console.log(err)
        },
    })

    const deleteJourney = useMutation({
        mutationFn: async () => {
            const response = await axiosPrivate.delete(`${BASE_URL}/api/journeys/${id}`)
            return response.data
        },
        onSuccess: () => {
            // Invalidate and refetch journey queries
            queryClient.invalidateQueries({ queryKey: ["journeys"] })
            queryClient.invalidateQueries({ queryKey: ["discovers"] })
            // Navigate back to profile or home
            navigate("/profile")
        },
        onError: (err) => {
            console.error("Error deleting journey:", err)
        },
    })

    const likePost = useMutation({
        mutationFn: async (variables) => {
            const { postId, value } = variables
            const response = await axiosPrivate.post(`${BASE_URL}/api/posts/like/${postId}`, {
                value,
            })
            return response.data
        },
        onMutate: async (variables) => {
            const { postId, value } = variables

            await queryClient.cancelQueries({ queryKey: ["journeyPosts", id] })
            const previousData = queryClient.getQueryData(["journeyPosts", id])

            queryClient.setQueryData(["journeyPosts", id], (oldData) => {
                if (!oldData) return oldData

                return produce(oldData, (draft) => {
                    draft.pages.forEach((page) => {
                        page.data.forEach((post) => {
                            if (post._id === postId) {
                                post.hasLiked = value
                                post.likeCount += value ? 1 : -1
                            }
                        })
                    })
                })
            })

            return { previousData }
        },
        onError: (err, variables, context) => {
            if (context?.previousData)
                queryClient.setQueryData(["journeyPosts", id], context.previousData)
        },
    })

    const [fileError, setFileError] = useState(null)

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        console.log(file)
        setFileError(null)

        if (file) {
            // Check for file size of 0 (corrupt file)
            if (file.size === 0) {
                setFileError("Invalid or corrupt file")
                return
            }

            // For videos, check supported types and size limit (60MB)
            if (file.type.startsWith("video/")) {
                const supportedVideoTypes = ["video/mp4", "video/webm", "video/ogg"]
                const maxSizeInBytes = 60 * 1024 * 1024 // 60MB

                if (!supportedVideoTypes.includes(file.type)) {
                    setFileError("Unsupported video format. Please use MP4, WebM, or OGG.")
                    return
                }

                if (file.size > maxSizeInBytes) {
                    setFileError("Video file is too large. Maximum size is 60MB.")
                    return
                }

                const videoUrl = URL.createObjectURL(file)
                setImageSrc(videoUrl)
                setSelectedFile(file)
                setStep(0)
                return
            }

            // For images
            if (file.type.startsWith("image/")) {
                const supportedImageTypes = ["image/jpeg", "image/png", "image/gif"]
                const maxSizeInBytes = 10 * 1024 * 1024 // 10MB

                if (!supportedImageTypes.includes(file.type)) {
                    setFileError("Unsupported image format. Please use JPEG, PNG, or GIF.")
                    return
                }

                if (file.size > maxSizeInBytes) {
                    setFileError("Image file is too large. Maximum size is 10MB.")
                    return
                }

                const reader = new FileReader()
                reader.onload = () => {
                    setImageSrc(reader.result)
                    setSelectedFile(file)
                    setStep(0)
                }
                reader.readAsDataURL(file)
                return
            }

            // If file type is neither image nor video
            setFileError("Unsupported file type. Please upload an image or video.")
        }
    }

    const onCropComplete = async (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }

    const handleNext = async () => {
        try {
            const isImage = selectedFile && selectedFile.type.startsWith("image/")
            // Only crop if it's an image; skip for videos
            if (isImage && imageSrc && croppedAreaPixels) {
                const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
                setCroppedImage(croppedImage)
            }
            setStep(1)
        } catch (e) {
            console.error(e)
        }
    }

    const resetState = () => {
        setIsModalOpen(false)
        setStep(0)
        setImageSrc(null)
        setSelectedFile(null)
        setCroppedImage(null)
        setPostContent("")
        setFileError(null)
    }

    const handleSubmit = async () => {
        console.log(selectedFile)

        createPost.mutate()
    }

    const onZoomChange = (newZoom) => {
        setZoom(newZoom)
    }

    const onCropChange = (newCrop) => {
        setCrop(newCrop)
    }

    const getErrorMessage = (error) => {
        if (error?.response?.data) {
            const isHTML =
                typeof error.response.data === "string" &&
                (error.response.data.trim().startsWith("<!DOCTYPE") ||
                    error.response.data.trim().startsWith("<html"))

            if (!isHTML) {
                return error.response.data
            }
        }

        if (error?.message === "Network Error") {
            return "Unable to connect to server. Please check your internet connection."
        }

        return "Failed to create post. Please try again."
    }

    const renderModalContent = () => {
        if (step === 0) {
            const isImage = selectedFile && selectedFile.type.startsWith("image/")
            const isVideo = selectedFile && selectedFile.type.startsWith("video/")
            return (
                <div style={styles.modalStep1}>
                    <div style={styles.modalHeader}>
                        <div>
                            <span
                                role='button'
                                tabIndex={0}
                                onClick={handleNext}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") handleNext()
                                }}
                                style={styles.nextTextLink}
                            >
                                Next
                            </span>
                        </div>
                    </div>
                    <div style={styles.cropperContainer}>
                        {imageSrc && isImage ? (
                            <div style={styles.cropperWrapper}>
                                <div style={styles.cropperContent}>
                                    <Cropper
                                        image={imageSrc}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={1}
                                        maxZoom={2}
                                        minZoom={1}
                                        objectFit='cover'
                                        zoomSpeed={0.4}
                                        onZoomChange={onZoomChange}
                                        onCropChange={onCropChange}
                                        onCropComplete={onCropComplete}
                                        showGrid={!!imageSrc}
                                        restrictPosition={true}
                                        style={styles.cropperStyle}
                                    />
                                    <button
                                        onClick={() => {
                                            setImageSrc(null)
                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = ""
                                            }
                                        }}
                                        style={styles.cropperCloseButton}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ) : imageSrc && isVideo ? (
                            <div
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "#111",
                                    borderRadius: 12,
                                }}
                            >
                                <video
                                    src={videoUrlRef.current}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        maxHeight: "100%",
                                        objectFit: "contain",
                                        borderRadius: 12,
                                    }}
                                    poster={imageSrc}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        left: "50%",
                                        top: "50%",
                                        transform: "translate(-50%, -50%)",
                                        pointerEvents: "none",
                                    }}
                                >
                                    <svg
                                        width='48'
                                        height='48'
                                        viewBox='0 0 48 48'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <circle
                                            cx='24'
                                            cy='24'
                                            r='24'
                                            fill='rgba(0,0,0,0.5)'
                                        />
                                        <polygon
                                            points='20,16 34,24 20,32'
                                            fill='#fff'
                                        />
                                    </svg>
                                </div>
                                <button
                                    onClick={() => {
                                        setImageSrc(null)
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = ""
                                        }
                                    }}
                                    style={styles.cropperCloseButton}
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div
                                style={styles.uploadPrompt}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <svg
                                    style={styles.uploadIcon}
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='currentColor'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                                    />
                                </svg>
                                {fileError ? (
                                    <p
                                        style={{
                                            ...styles.uploadText,
                                            color: "#ff4444",
                                            fontWeight: "500",
                                        }}
                                    >
                                        {fileError}
                                    </p>
                                ) : (
                                    <p style={styles.uploadText}>
                                        Click to upload a photo or video
                                    </p>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type='file'
                                    accept='image/*,video/*'
                                    style={styles.hiddenInput}
                                    onChange={handleFileChange}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        return (
            <div style={isMobile ? styles.modalStep2Mobile : styles.modalStep2Desktop}>
                {/* Header with preview and share button */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "20px",
                    }}
                >
                    {/* Small preview at top left */}
                    <div
                        style={{
                            width: "80px",
                            height: "80px",
                            backgroundColor: "#000",
                            borderRadius: "8px",
                            overflow: "hidden",
                            flexShrink: 0,
                            margin: "8px",
                            position: "relative",
                        }}
                    >
                        {croppedImage || selectedFile ? (
                            croppedImage ? (
                                <img
                                    src={croppedImage}
                                    alt='Preview'
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            ) : selectedFile && selectedFile.type.startsWith("video/") ? (
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        position: "relative",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        backgroundColor: "#222",
                                        borderRadius: "8px",
                                    }}
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "50%",
                                            left: "50%",
                                            transform: "translate(-50%, -50%)",
                                        }}
                                    >
                                        <svg
                                            width='30'
                                            height='30'
                                            viewBox='0 0 24 24'
                                            fill='none'
                                            xmlns='http://www.w3.org/2000/svg'
                                        >
                                            <path
                                                d='M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 000-1.69L9.54 5.98A.998.998 0 008 6.82z'
                                                fill='#ffffff'
                                            />
                                        </svg>
                                    </div>
                                </div>
                            ) : selectedFile && selectedFile.type.startsWith("image/") ? (
                                <img
                                    src={URL.createObjectURL(selectedFile)}
                                    alt='Preview'
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            ) : null
                        ) : null}
                    </div>

                    {/* Share button at top right */}
                    <button
                        onClick={handleSubmit}
                        disabled={createPost.isPending || (!postContent.trim() && !selectedFile)}
                        style={{
                            background: "none",
                            border: "none",
                            color:
                                createPost.isPending || (!postContent.trim() && !selectedFile)
                                    ? "#666"
                                    : "#0095f6",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor:
                                createPost.isPending || (!postContent.trim() && !selectedFile)
                                    ? "not-allowed"
                                    : "pointer",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            if (!createPost.isPending && (postContent.trim() || selectedFile)) {
                                e.target.style.backgroundColor = "rgba(0, 149, 246, 0.1)"
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent"
                        }}
                    >
                        {createPost.isPending ? "Posting..." : "Share"}
                    </button>
                </div>

                {/* Textarea container */}
                <div style={styles.inputContainer}>
                    <div
                        style={{
                            position: "relative",
                            height: "550px",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <textarea
                            ref={mentionInputRef}
                            value={postContent}
                            onChange={(e) => {
                                const value = e.target.value
                                setPostContent(value)
                                handleMentionInputChange(value, e)
                            }}
                            style={{
                                ...styles.textarea,
                                width: "100%",
                                height: "100%",
                                minHeight: "unset",
                                marginTop: "40px",
                                boxSizing: "border-box",
                            }}
                            placeholder='Write a caption...'
                        />
                        <MentionAutocomplete
                            isVisible={showMentionPopup}
                            searchTerm={mentionSearchTerm}
                            onSelectUser={handleMentionSelect}
                            onClose={closeMentionPopup}
                            position={mentionPosition}
                            inputRef={mentionInputRef}
                            forceLowerPosition={true}
                        />
                    </div>
                    {createPost.error && (
                        <div style={styles.errorMessage}>{getErrorMessage(createPost.error)}</div>
                    )}
                </div>
            </div>
        )
    }

    const handleLike = (postId, value) => {
        if (!userData) return
        likePost.mutate({ postId, value })
    }

    const handleCommentClick = (post) => {
        setSelectedPost(post)
        setIsCommentsOpen(true)
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        if (!posts.data?.pages) return
        intersectionRatiosRef.current = {}
        const observer = new window.IntersectionObserver(
            (entries) => {
                const newInViewMap = { ...inViewMap }
                entries.forEach((entry) => {
                    intersectionRatiosRef.current[entry.target.dataset.postid] =
                        entry.intersectionRatio
                    newInViewMap[entry.target.dataset.postid] = entry.isIntersecting
                })
                setInViewMap(newInViewMap)
                // Find the most visible
                let maxRatio = 0
                let maxId = null
                Object.entries(intersectionRatiosRef.current).forEach(([id, ratio]) => {
                    if (ratio > maxRatio) {
                        maxRatio = ratio
                        maxId = id
                    }
                })
                // Only update if new video is at least 10% more visible, or current is not visible
                const lastMaxId = lastMaxIdRef.current
                const lastRatio = intersectionRatiosRef.current[lastMaxId] || 0
                const HYSTERESIS = 0.1
                const shouldUpdate =
                    !lastMaxId ||
                    !intersectionRatiosRef.current[lastMaxId] ||
                    (maxId !== lastMaxId && maxRatio > lastRatio + HYSTERESIS)
                if (shouldUpdate) {
                    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
                    debounceTimeoutRef.current = setTimeout(() => {
                        setCurrentlyPlayingId(maxId)
                        lastMaxIdRef.current = maxId
                    }, 100)
                }
            },
            { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
        )
        containerRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref)
        })
        return () => {
            observer.disconnect()
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
        }
    }, [posts.data])

    const isFetching = journey.isFetching || posts.isFetching

    console.log(journey.data + "  " + id)

    return !isFetching && journey.data ? (
        <div className='page-wrapper journey-viewer-page'>
            <div
                style={{
                    ...styles.journeyHeader,
                    ...(isMobile
                        ? {
                              width: "100vw",
                              marginLeft: "calc(50% - 50vw)",
                              marginRight: "calc(50% - 50vw)",
                              borderRadius: 0,
                          }
                        : {}),
                }}
            >
                {/* Removed top-right menu; moved three-dots into left actions row to avoid off-screen popover */}
                {/* Top-left actions: Add to journey + Mark/Unmark complete (now on mobile and desktop) */}
                <div style={styles.headerActionsLeft}>
                    <span
                        style={styles.actionItem}
                        onClick={() => setIsModalOpen(true)}
                        title='Add to journey'
                        aria-label='Add to journey'
                    >
                        <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            style={{ display: "block" }}
                        >
                            <line
                                x1='12'
                                y1='5'
                                x2='12'
                                y2='19'
                            ></line>
                            <line
                                x1='5'
                                y1='12'
                                x2='19'
                                y2='12'
                            ></line>
                        </svg>
                        <span>Add to journey</span>
                    </span>
                    {userData?._id === journey.data.creator._id && (
                        <span
                            style={{ ...styles.actionItem, ...styles.completeLink }}
                            onClick={() =>
                                journey.data.status
                                    ? markIncomplete.mutate()
                                    : markComplete.mutate()
                            }
                            title={journey.data.status ? "Unmark as complete" : "Mark as complete"}
                            aria-label={
                                journey.data.status ? "Unmark as complete" : "Mark as complete"
                            }
                        >
                            <svg
                                width='18'
                                height='18'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                style={{ display: "block" }}
                            >
                                <polyline points='20 6 9 17 4 12'></polyline>
                            </svg>
                            <span>
                                {journey.data.status ? "Unmark as complete" : "Mark as complete"}
                            </span>
                        </span>
                    )}
                    <div style={styles.actionLinks}>
                        <ThreeDotsMenu
                            onDelete={() => {
                                if (
                                    window.confirm(
                                        "Are you sure you want to delete this journey? This action cannot be undone.",
                                    )
                                ) {
                                    deleteJourney.mutate()
                                }
                            }}
                            isCreator={userData?._id === journey.data.creator._id}
                            position='right'
                        />
                    </div>
                </div>

                {/* Bottom-right user info */}
                <div style={styles.headerUserBottomRight}>
                    <ProfilePic
                        style={{ marginTop: 9 }}
                        src={
                            journey.data.creator?.profilePic
                                ? `${BASE_URL}/uploads/profilePics/${journey.data.creator.profilePic}`
                                : null
                        }
                        size={32}
                    />
                    <span style={styles.username}>{journey.data.creator.username}</span>
                </div>

                <div style={styles.journeyContent}>
                    {/* Row with left thumbnail (desktop) and main content */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {/* Desktop thumbnail like JourneyCard */}
                        {!isMobile && journey.data?.url && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minWidth: 88,
                                    width: 88,
                                    paddingRight: 8,
                                }}
                            >
                                <img
                                    src={`${BASE_URL}${journey.data?.url}`}
                                    alt={journey.data.title}
                                    style={{
                                        width: 64,
                                        height: 64,
                                        objectFit: "cover",
                                        borderRadius: 10,
                                        cursor: "default",
                                    }}
                                />
                            </div>
                        )}
                        {/* Main text content */}
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                            <h1
                                style={{
                                    ...styles.journeyTitle,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 5,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                    margin: 0,
                                    marginTop: isMobile ? 28 : 24,
                                }}
                                title={journey.data.title}
                            >
                                {journey.data.title}
                            </h1>
                            <p
                                style={{
                                    ...styles.journeyDescription,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 5,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                }}
                                title={journey.data.description}
                            >
                                {journey.data.description}
                            </p>
                            {/* Mobile thumbnail below text like JourneyCard */}
                            {isMobile && journey.data?.url && (
                                <img
                                    src={`${BASE_URL}${journey.data.url}`}
                                    alt={journey.data.title}
                                    style={{
                                        width: 100,
                                        height: 100,
                                        objectFit: "cover",
                                        borderRadius: 10,
                                        cursor: "default",
                                    }}
                                />
                            )}
                            <div style={styles.journeyMeta}>
                                <span style={styles.statusBadge(journey.data.status)}>
                                    {journey.data.status ? "Completed" : "In Progress"}
                                </span>
                                <span style={styles.journeyDate}>
                                    Created {formatDate(journey.data.createdAt)}
                                </span>
                            </div>
                            {Array.isArray(journey.data.tags) && journey.data.tags.length > 0 && (
                                <div style={styles.tagsContainer}>
                                    {journey.data.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            style={styles.tag}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* Mobile actions moved to top-left; bottom row removed */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Full journey info modal (MUI) */}
            <MUIModal
                open={isInfoOpen}
                onClose={() => setIsInfoOpen(false)}
            >
                {isMobile ? (
                    <div
                        role='dialog'
                        aria-modal='true'
                        style={{
                            position: "fixed",
                            inset: 0,
                            backgroundColor: "#1a1a1a",
                            color: "#fff",
                            overflowY: "auto",
                            overflowX: "hidden",
                            padding: 16,
                            paddingBottom: 24,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Close X */}
                        <button
                            onClick={() => setIsInfoOpen(false)}
                            style={{
                                ...styles.cropperCloseButton,
                                top: 6,
                                right: 6,
                                width: 28,
                                height: 28,
                                padding: "0.25rem",
                                fontSize: "1.125rem",
                            }}
                            aria-label='Close'
                        >
                            ×
                        </button>
                        {/* Header: title left, user info top-right near close */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                marginTop: 8,
                                marginBottom: 12,
                                paddingRight: 36,
                            }}
                        >
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: "1.125rem",
                                    lineHeight: 1.3,
                                    flex: 1,
                                    minWidth: 0,
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                }}
                            >
                                {journey.data.title}
                            </h2>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    maxWidth: "45%",
                                    overflow: "hidden",
                                }}
                            >
                                <span
                                    style={{
                                        color: "#ccc",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {journey.data.creator?.username}
                                </span>
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        background: "#333",
                                        flexShrink: 0,
                                    }}
                                >
                                    <ProfilePic
                                        src={
                                            journey.data.creator?.profilePic
                                                ? `${BASE_URL}${journey.data.creator.profilePic}`
                                                : null
                                        }
                                        size={24}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description at top area */}
                        <div
                            style={{
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.6,
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                            }}
                        >
                            {journey.data.description}
                        </div>
                        {Array.isArray(journey.data.tags) && journey.data.tags.length > 0 && (
                            <div
                                style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
                            >
                                {journey.data.tags.map((t, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            background: "#333",
                                            border: "1px solid #444",
                                            color: "#fff",
                                            padding: "4px 8px",
                                            borderRadius: 12,
                                            fontSize: 12,
                                        }}
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        {/* Footer pinned to bottom: status and date */}
                        <div
                            style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                marginTop: 16,
                                marginLeft: 0,
                                marginRight: 0,
                                marginBottom: 0,
                            }}
                        >
                            <span style={styles.statusBadge(journey.data.status)}>
                                {journey.data.status ? "Completed" : "In Progress"}
                            </span>
                            <span style={styles.journeyDate}>
                                Created {formatDate(journey.data.createdAt)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div
                        role='dialog'
                        aria-modal='true'
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "50vw",
                            maxWidth: 640,
                            maxHeight: "85vh",
                            overflowY: "auto",
                            overflowX: "hidden",
                            backgroundColor: "#1a1a1a",
                            color: "#fff",
                            borderRadius: 12,
                            padding: 20,
                            paddingBottom: 24,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Close X */}
                        <button
                            onClick={() => setIsInfoOpen(false)}
                            style={{
                                ...styles.cropperCloseButton,
                                top: 6,
                                right: 6,
                                width: 28,
                                height: 28,
                                padding: "0.25rem",
                                fontSize: "1.125rem",
                            }}
                            aria-label='Close'
                        >
                            ×
                        </button>
                        {/* Header: title left, user info top-right near close */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                marginTop: 4,
                                marginBottom: 12,
                                paddingRight: 36,
                            }}
                        >
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: "1.25rem",
                                    lineHeight: 1.3,
                                    flex: 1,
                                    minWidth: 0,
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                }}
                            >
                                {journey.data.title}
                            </h2>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    maxWidth: "45%",
                                    overflow: "hidden",
                                }}
                            >
                                <span
                                    style={{
                                        color: "#ccc",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {journey.data.creator?.username}
                                </span>
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        overflow: "hidden",
                                        background: "#333",
                                        flexShrink: 0,
                                    }}
                                >
                                    <img
                                        src={
                                            journey.data.creator?.profilePic ||
                                            "/default-avatar.png"
                                        }
                                        alt={journey.data.creator?.username}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div
                            style={{
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.6,
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                            }}
                        >
                            {journey.data.description}
                        </div>
                        {Array.isArray(journey.data.tags) && journey.data.tags.length > 0 && (
                            <div
                                style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
                            >
                                {journey.data.tags.map((t, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            background: "#333",
                                            border: "1px solid #444",
                                            color: "#fff",
                                            padding: "4px 8px",
                                            borderRadius: 12,
                                            fontSize: 12,
                                        }}
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        {/* Footer: status and date */}
                        <div
                            style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                marginTop: 16,
                            }}
                        >
                            <span style={styles.statusBadge(journey.data.status)}>
                                {journey.data.status ? "Completed" : "In Progress"}
                            </span>
                            <span style={styles.journeyDate}>
                                Created {formatDate(journey.data.createdAt)}
                            </span>
                        </div>
                    </div>
                )}
            </MUIModal>

            <MUIModal
                open={isModalOpen}
                onClose={resetState}
            >
                {isMobile ? (
                    <div
                        role='dialog'
                        aria-modal='true'
                        style={{
                            position: "fixed",
                            inset: 0,
                            backgroundColor: "#1a1a1a",
                            color: "#fff",
                            overflowY: "auto",
                            overflowX: "hidden",
                            padding: step === 0 ? 0 : 12,
                            paddingBottom: step === 0 ? 0 : 24,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {renderModalContent()}
                    </div>
                ) : (
                    <div
                        role='dialog'
                        aria-modal='true'
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "60vw",
                            maxWidth: 920,
                            maxHeight: "85vh",
                            overflowY: "auto",
                            overflowX: "hidden",
                            backgroundColor: "#1a1a1a",
                            color: "#fff",
                            borderRadius: 12,
                            padding: 16,
                            paddingBottom: 24,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {renderModalContent()}
                    </div>
                )}
            </MUIModal>

            {posts.isLoading ? (
                <div style={styles.postsGrid}>
                    {[...Array(4)].map((_, idx) => (
                        <Skeleton
                            key={idx}
                            className='h-32 w-full rounded-lg'
                        />
                    ))}
                </div>
            ) : !posts.data?.pages ||
              posts.data.pages.every((page) => !page.data || page.data.length === 0) ? (
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
                    <h3 style={styles.emptyStateTitle}>No journey posts</h3>
                    <p style={styles.emptyStateDescription}>
                        There are no posts in this journey yet.
                    </p>
                </div>
            ) : (
                <div style={styles.postsGrid}>
                    {posts.data?.pages.map((page, i) =>
                        page.data.map((post, j) => {
                            const refCallback = (el) => {
                                containerRefs.current[i * 1000 + j] = el
                            }
                            const isInView = !!inViewMap[post._id]
                            const shouldPlay = currentlyPlayingId === post._id
                            return (
                                <JourneyPost
                                    key={post._id}
                                    post={post}
                                    cacheKey={["journeyPosts", id]}
                                    isInView={isInView}
                                    shouldPlay={shouldPlay}
                                    setCurrentlyPlayingId={setCurrentlyPlayingId}
                                    containerRef={refCallback}
                                    type='post'
                                />
                            )
                        }),
                    )}
                </div>
            )}
        </div>
    ) : (
        <div style={styles.container}>
            {/* Journey Header Skeleton - One long box */}
            <Skeleton
                style={{
                    width: "100%",
                    height: "200px",
                    borderRadius: "1rem",
                    marginBottom: "2.5rem",
                }}
            />

            {/* Posts Grid Skeleton - Rows same size as journey posts */}
            <div style={styles.postsGrid}>
                {[...Array(6)].map((_, idx) => (
                    <Skeleton
                        key={idx}
                        style={{
                            width: "100%",
                            maxWidth: isMobile ? "100%" : "500px",
                            height: isMobile ? "450px" : "500px",
                            borderRadius: "12px",
                            marginLeft: "auto",
                            marginRight: "auto",
                            marginBottom: "1.5rem",
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

export default JourneyViewer
