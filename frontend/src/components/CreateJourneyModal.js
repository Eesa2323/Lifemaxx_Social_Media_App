import React, { useState, useRef, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { produce } from "immer"
import { BASE_URL, SMALL_SCREEN_SIZE } from "../utils/config"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { useMediaQuery } from "react-responsive"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import { MdOutlinePhotoCamera as PhotoCamera } from "react-icons/md"
import Button from "./Button"
import ThumbnailCropper from "./ThumbnailCropper"
const CATEGORIES = [
    { id: "Fitness", title: "Fitness", icon: "💪" },
    { id: "Money", title: "Money", icon: "💼" },
    { id: "Self-Improvement", title: "Self-Improvement", icon: "🎯" },
    { id: "Looksmaxxing", title: "Looksmaxxing", icon: "✨" },
]

const CreateJourneyModal = ({ isOpen, onClose, userId }) => {
    const queryClient = useQueryClient()
    const axiosPrivate = useAxiosPrivate()
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [selectedCategories, setSelectedCategories] = useState([])
    const [thumbnailFile, setThumbnailFile] = useState(null)
    const [thumbnailPreview, setThumbnailPreview] = useState(null)
    const fileInputRef = useRef(null)
    const [isCropperOpen, setIsCropperOpen] = useState(false)
    const [rawImageUrl, setRawImageUrl] = useState(null)

    // Validation - check if strings contain at least one non-whitespace character
    const isValidInput = (str) => str && str.trim().length > 0
    const isTitleValid = isValidInput(title)
    const isDescriptionValid = isValidInput(description)

    const createJourneyMutation = useMutation({
        mutationFn: async ({ title, description, tags, thumbnail }) => {
            const formData = new FormData()
            formData.append("title", title)
            formData.append("description", description)
            formData.append("tags", JSON.stringify(tags || []))
            if (thumbnail) formData.append("file", thumbnail)

            const res = await axiosPrivate.post(`${BASE_URL}/api/journeys`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
            return res.data
        },
        onSuccess: (data) => {
            const { journey } = data
            onClose()
            setTitle("")
            setDescription("")
            setSelectedCategories([])
            setThumbnailFile(null)
            setThumbnailPreview(null)
            queryClient.setQueryData(["journeys", userId], (oldData) => {
                return produce(oldData, (draft) => {
                    if (!draft) return
                    if (draft.pages?.[0]?.data) {
                        draft.pages[0].data.unshift(journey)
                    } else {
                        draft.pages[0] = { data: [journey] }
                    }
                })
            })
        },
    })

    const handleCategoryToggle = (cat) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        )
    }

    const handleCreateJourney = (e) => {
        e.preventDefault()
        createJourneyMutation.mutate({
            title,
            description,
            tags: selectedCategories,
            thumbnail: thumbnailFile,
        })
    }

    const handleThumbnailClick = () => fileInputRef.current?.click()

    const handleThumbnailChange = (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        // open cropper for square (100x100)
        const url = URL.createObjectURL(f)
        setRawImageUrl(url)
        setIsCropperOpen(true)
    }

    // cleanup raw image URL
    useEffect(() => {
        return () => {
            if (rawImageUrl) URL.revokeObjectURL(rawImageUrl)
        }
    }, [rawImageUrl])

    const handleCropConfirm = async (blob) => {
        // Convert blob to File for form-data upload
        const croppedFile = new File([blob], "thumbnail.jpg", { type: blob.type || "image/jpeg" })
        // Preview URL
        // Revoke previous preview if any
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
        const previewUrl = URL.createObjectURL(blob)
        setThumbnailFile(croppedFile)
        setThumbnailPreview(previewUrl)
        setIsCropperOpen(false)
        // clear raw url
        if (rawImageUrl) {
            URL.revokeObjectURL(rawImageUrl)
            setRawImageUrl(null)
        }
    }

    return (
        <>
            <Dialog
                open={isOpen}
                onClose={onClose}
                fullScreen={isMobile}
                maxWidth='sm'
                fullWidth
                PaperProps={{
                    style: {
                        backgroundColor: "#000",
                        color: "#fff",
                    },
                }}
            >
                <DialogTitle style={{ borderBottom: "1px solid #333", color: "#fff" }}>
                    <span style={{ display: "inline-block", marginTop: 7, marginBottom: 7 }}>
                        Create Journey
                    </span>
                </DialogTitle>
                <DialogContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (isTitleValid && isDescriptionValid) handleCreateJourney(e)
                        }}
                        style={{
                            display: "flex",
                            marginTop: 20,
                            flexDirection: "column",
                            gap: 18,
                            paddingTop: 6,
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <input
                                type='text'
                                placeholder='Title'
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={{
                                    padding: 10,
                                    borderRadius: 8,
                                    border: `1px solid ${
                                        title && !isTitleValid ? "#ff4444" : "#333"
                                    }`,
                                    background: "#181818",
                                    color: "white",
                                    fontSize: 16,
                                }}
                            />
                            {title && !isTitleValid && (
                                <div style={{ color: "#ff4444", fontSize: 12, marginTop: 2 }}>
                                    Title cannot contain only spaces
                                </div>
                            )}
                            <textarea
                                placeholder='Description'
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                style={{
                                    padding: 10,
                                    borderRadius: 8,
                                    border: `1px solid ${
                                        description && !isDescriptionValid ? "#ff4444" : "#333"
                                    }`,
                                    background: "#181818",
                                    color: "white",
                                    fontSize: 14,
                                    resize: "none",
                                }}
                            />
                            {description && !isDescriptionValid && (
                                <div style={{ color: "#ff4444", fontSize: 12, marginTop: 2 }}>
                                    Description cannot contain only spaces
                                </div>
                            )}

                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <input
                                    ref={fileInputRef}
                                    type='file'
                                    accept='image/*'
                                    style={{ display: "none" }}
                                    onChange={handleThumbnailChange}
                                />
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        cursor: "pointer",
                                    }}
                                    onClick={handleThumbnailClick}
                                >
                                    <IconButton
                                        color='primary'
                                        aria-label='upload picture'
                                        component='span'
                                        size='small'
                                    >
                                        <PhotoCamera />
                                    </IconButton>
                                    <span style={{ fontSize: 14 }}>Add thumbnail (optional)</span>
                                </div>

                                {thumbnailPreview && (
                                    <div
                                        style={{
                                            marginLeft: "auto",
                                            position: "relative",
                                            width: 64,
                                            height: 64,
                                        }}
                                    >
                                        <img
                                            src={thumbnailPreview}
                                            alt='thumb'
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                borderRadius: 8,
                                                objectFit: "cover",
                                            }}
                                        />
                                        <button
                                            type='button'
                                            onClick={() => {
                                                if (thumbnailPreview)
                                                    URL.revokeObjectURL(thumbnailPreview)
                                                setThumbnailPreview(null)
                                                setThumbnailFile(null)
                                            }}
                                            aria-label='Remove thumbnail'
                                            style={{
                                                position: "absolute",
                                                top: -6,
                                                right: -6,
                                                width: 20,
                                                height: 20,
                                                borderRadius: "50%",
                                                background: "#222",
                                                color: "#fff",
                                                border: "1px solid #444",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 12,
                                                cursor: "pointer",
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <label style={{ fontWeight: 500, marginBottom: 4 }}>
                                Categories <span style={{ color: "#ff4444" }}>*</span>
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                {CATEGORIES.map((cat) => (
                                    <div
                                        key={cat.id}
                                        onClick={() => handleCategoryToggle(cat.id)}
                                        style={{
                                            padding: "10px 18px",
                                            borderRadius: 8,
                                            border: selectedCategories.includes(cat.id)
                                                ? "2px solid #ff4444"
                                                : "1px solid #333",
                                            background: selectedCategories.includes(cat.id)
                                                ? "#2a1a1a"
                                                : "#181818",
                                            color: selectedCategories.includes(cat.id)
                                                ? "#ff4444"
                                                : "white",
                                            fontWeight: 500,
                                            fontSize: 16,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        <span>{cat.icon}</span> {cat.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {selectedCategories.length > 0 && (
                            <div
                                style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
                            >
                                {selectedCategories.map((cat) => (
                                    <span
                                        key={cat}
                                        style={{
                                            background: "#ff4444",
                                            color: "white",
                                            borderRadius: 16,
                                            padding: "4px 14px",
                                            fontSize: 14,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 12,
                                marginTop: 16,
                            }}
                        >
                            <div style={{ width: "100%", maxWidth: 300, minWidth: 200 }}>
                                <Button
                                    disabled={
                                        !isTitleValid ||
                                        !isDescriptionValid ||
                                        selectedCategories.length === 0 ||
                                        createJourneyMutation.isPending
                                    }
                                    onClick={(e) => {
                                        if (
                                            isTitleValid &&
                                            isDescriptionValid &&
                                            selectedCategories.length > 0
                                        )
                                            handleCreateJourney(e)
                                    }}
                                    style={{
                                        padding: "12px 24px",
                                        height: 46,
                                    }}
                                >
                                    {createJourneyMutation.isPending
                                        ? "Creating..."
                                        : "Create Journey"}
                                </Button>
                            </div>
                            {createJourneyMutation.isError && (
                                <div
                                    style={{ color: "#ff4444", marginTop: 8, textAlign: "center" }}
                                >
                                    {createJourneyMutation.error?.response?.data?.message ||
                                        "Failed to create journey."}
                                </div>
                            )}
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            <ThumbnailCropper
                open={isCropperOpen}
                imageSrc={rawImageUrl}
                onClose={() => {
                    setIsCropperOpen(false)
                    if (rawImageUrl) {
                        URL.revokeObjectURL(rawImageUrl)
                        setRawImageUrl(null)
                    }
                }}
                onCropped={handleCropConfirm}
                outputSize={100}
            />
        </>
    )
}

export default CreateJourneyModal
