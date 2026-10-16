import React, { useState, useRef, useCallback, useEffect } from "react"
import { useMediaQuery } from "react-responsive"
import { Dialog, useTheme } from "@mui/material"
import Cropper from "react-easy-crop"
import getCroppedImg from "../utils/cropImage"
import { FiImage, FiType, FiEdit3 } from "react-icons/fi"
import useStories from "../hooks/useStories"

const StoryModal = ({ isOpen, onClose }) => {
    const { createStoryMutation } = useStories()
    const [selectedFile, setSelectedFile] = useState(null)
    const [imageSrc, setImageSrc] = useState(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [minZoom, setMinZoom] = useState(0.1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [textMode, setTextMode] = useState(false)
    const [textBoxes, setTextBoxes] = useState([])
    const [activeTextBox, setActiveTextBox] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [dragStart, setDragStart] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [paintMode, setPaintMode] = useState(false)
    const [selectedColor, setSelectedColor] = useState("#ffffff")
    const [isDrawing, setIsDrawing] = useState(false)
    const [paths, setPaths] = useState([])
    const [currentPath, setCurrentPath] = useState([])
    const [validationError, setValidationError] = useState(null)
    const [isValidFile, setIsValidFile] = useState(true)

    const fileInputRef = useRef(null)
    const videoUrlRef = useRef(null)
    const textRefs = useRef({})
    const canvasRef = useRef(null)
    const drawingCanvasRef = useRef(null)
    const svgRef = useRef(null)
    const theme = useTheme()
    const isMobile = useMediaQuery({ maxWidth: 768 })

    // Auto-resize textarea when activeTextBox changes
    useEffect(() => {
        if (isEditing && activeTextBox !== null && textRefs.current[activeTextBox]) {
            const textarea = textRefs.current[activeTextBox]
            setTimeout(() => {
                textarea.style.height = "auto"
                textarea.style.height = Math.max(textarea.scrollHeight, 24) + "px"
                textarea.style.width = "auto"
                textarea.style.width =
                    Math.min(Math.max(textarea.scrollWidth + 10, 60), isMobile ? 300 : 400) + "px"
            }, 0)
        }
    }, [isEditing, activeTextBox])

    const validateFile = (file) => {
        // Allowed file types
        const allowedImageTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp",
        ]
        const allowedVideoTypes = [
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/avi",
            "video/mov",
            "video/quicktime",
        ]
        const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes]

        // Check file type
        if (!allAllowedTypes.includes(file.type)) {
            return "Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, OGG, AVI, MOV) are allowed."
        }

        // Check file size (60MB limit)
        const maxSize = 60 * 1024 * 1024 // 60MB
        if (file.size > maxSize) {
            return "File size is too large. Maximum size is 60MB."
        }

        return null // No error
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Validate file
            const error = validateFile(file)
            if (error) {
                setValidationError(error)
                setIsValidFile(false)
                setSelectedFile(null)
                setImageSrc(null)
                return
            }

            // Clear any previous errors
            setValidationError(null)
            setIsValidFile(true)
            setSelectedFile(file)

            const reader = new FileReader()
            reader.onload = () => {
                setImageSrc(reader.result)
                if (file.type.startsWith("video/")) {
                    videoUrlRef.current = reader.result
                }
            }
            reader.readAsDataURL(file)
        }
    }

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const onCropChange = useCallback((crop) => {
        // Restrict crop movement to prevent showing black background
        // For story format, we want minimal movement to keep image covering full area
        const restrictedCrop = {
            x: Math.max(-50, Math.min(50, crop.x)), // Limit horizontal movement
            y: Math.max(-50, Math.min(50, crop.y)), // Limit vertical movement
        }
        setCrop(restrictedCrop)
    }, [])

    const onMediaLoaded = useCallback((mediaSize) => {
        // Ensure the image always covers the full canvas
        const canvasAspect = 9 / 16 // Story aspect ratio (width/height)
        const imageAspect = mediaSize.width / mediaSize.height

        // Calculate minimum zoom to ensure no background is visible
        // We need the image to cover the entire canvas area
        let minZoomToFill
        if (imageAspect > canvasAspect) {
            // Image is wider than canvas - zoom to fill height completely
            minZoomToFill = 1
        } else {
            // Image is taller than canvas - zoom to fill width completely
            minZoomToFill = canvasAspect / imageAspect
        }

        // Ensure minimum zoom is at least 1 to prevent showing background
        const finalMinZoom = Math.max(minZoomToFill, 1)
        setMinZoom(finalMinZoom)
        setZoom(finalMinZoom)
    }, [])

    const handleTextContainerMouseDown = (e, textBoxId) => {
        if (paintMode) return

        // Don't start dragging if clicking on textarea
        if (e.target.tagName === "TEXTAREA") return

        e.preventDefault()
        setActiveTextBox(textBoxId)
        setTextMode(false) // Turn off text mode when interacting with existing text

        // If currently editing another textbox, stop editing
        if (isEditing && activeTextBox !== textBoxId) {
            setIsEditing(false)
        }

        // Store initial mouse position for drag detection
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            timestamp: Date.now(),
        })

        const rect = canvasRef.current.getBoundingClientRect()
        const textRect = e.currentTarget.getBoundingClientRect()
        setDragOffset({
            x: e.clientX - (textRect.left + textRect.width / 2),
            y: e.clientY - (textRect.top + textRect.height / 2),
        })
    }

    const handleMouseMove = (e) => {
        if (paintMode && isDrawing) {
            const rect = canvasRef.current.getBoundingClientRect()
            const x = ((e.clientX - rect.left) / rect.width) * 100
            const y = ((e.clientY - rect.top) / rect.height) * 100
            setCurrentPath((prev) => [...prev, { x, y }])
        } else if (dragStart && activeTextBox !== null) {
            // Check if mouse has moved enough to start dragging (3px threshold - reduced for better responsiveness)
            const dragDistance = Math.sqrt(
                Math.pow(e.clientX - dragStart.x, 2) + Math.pow(e.clientY - dragStart.y, 2),
            )

            if (dragDistance > 3 && !isDragging) {
                setIsDragging(true)
            }

            if (isDragging || dragDistance > 3) {
                e.preventDefault()
                const rect = canvasRef.current.getBoundingClientRect()
                const newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100
                const newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100

                setTextBoxes((prev) =>
                    prev.map((box) =>
                        box.id === activeTextBox
                            ? {
                                  ...box,
                                  position: {
                                      x: Math.max(15, Math.min(85, newX)),
                                      y: Math.max(15, Math.min(85, newY)),
                                  },
                              }
                            : box,
                    ),
                )
            }
        }
    }

    const handleMouseUp = () => {
        if (paintMode && isDrawing && currentPath.length > 0) {
            if (selectedColor === "eraser") {
                // Eraser mode: remove paths that intersect with the eraser path
                setPaths((prev) =>
                    prev.filter((existingPath) => {
                        // Simple collision detection - check if any point in existing path is close to eraser path
                        return !existingPath.path.some((existingPoint) =>
                            currentPath.some((eraserPoint) => {
                                const distance = Math.sqrt(
                                    Math.pow(existingPoint.x - eraserPoint.x, 2) +
                                        Math.pow(existingPoint.y - eraserPoint.y, 2),
                                )
                                return distance < 5 // Eraser radius
                            }),
                        )
                    }),
                )
            } else {
                // Normal drawing mode
                setPaths((prev) => [...prev, { path: currentPath, color: selectedColor }])
            }
            setCurrentPath([])
        }
        setIsDragging(false)
        setDragStart(null)
        setIsDrawing(false)
    }

    const handleMouseDown = (e) => {
        if (paintMode) {
            setIsDrawing(true)
            const rect = canvasRef.current.getBoundingClientRect()
            const x = ((e.clientX - rect.left) / rect.width) * 100
            const y = ((e.clientY - rect.top) / rect.height) * 100
            setCurrentPath([{ x, y }])
        }
    }

    const handleCanvasClick = (e) => {
        if (isDragging || paintMode) return

        // If currently editing, check if textbox is empty and remove it if so
        if (isEditing && activeTextBox !== null) {
            const currentTextBox = textBoxes.find((box) => box.id === activeTextBox)
            if (
                currentTextBox &&
                (!currentTextBox.content || currentTextBox.content.trim() === "")
            ) {
                deleteTextBox(activeTextBox)
            }
            setIsEditing(false)
            setActiveTextBox(null)
            return
        }

        if (textMode) {
            const rect = canvasRef.current.getBoundingClientRect()
            const newX = ((e.clientX - rect.left) / rect.width) * 100
            const newY = ((e.clientY - rect.top) / rect.height) * 100

            const newTextBox = {
                id: Date.now(),
                content: "",
                position: {
                    x: Math.max(15, Math.min(85, newX)),
                    y: Math.max(15, Math.min(85, newY)),
                },
            }

            setTextBoxes((prev) => [...prev, newTextBox])
            setActiveTextBox(newTextBox.id)
            setIsEditing(true)

            setTimeout(() => {
                if (textRefs.current[newTextBox.id]) {
                    textRefs.current[newTextBox.id].focus()
                }
            }, 100)
        }
    }

    const handleTextClick = (e, textBoxId) => {
        e.stopPropagation()
        if (!isDragging && !paintMode) {
            // Only start editing if we're not in the middle of a drag operation
            const timeSinceMouseDown = dragStart ? Date.now() - (dragStart.timestamp || 0) : 0
            if (timeSinceMouseDown < 200) {
                // If less than 200ms since mousedown, likely a click not drag
                setActiveTextBox(textBoxId)
                setIsEditing(true)
                setTextMode(false) // Turn off text mode when editing existing text
                setTimeout(() => {
                    if (textRefs.current[textBoxId]) {
                        textRefs.current[textBoxId].focus()
                    }
                }, 10)
            }
        }
    }

    const handleTextBlur = (textBoxId) => {
        // Check if textbox is empty and remove it if so
        const currentTextBox = textBoxes.find((box) => box.id === textBoxId)
        if (currentTextBox && (!currentTextBox.content || currentTextBox.content.trim() === "")) {
            deleteTextBox(textBoxId)
        }
        setIsEditing(false)
        setActiveTextBox(null)
    }

    const handleTextChange = (content) => {
        if (activeTextBox !== null) {
            // Don't delete textbox immediately on empty content - let blur handle it
            // Find the current text box
            const currentTextBox = textBoxes.find((box) => box.id === activeTextBox)
            if (currentTextBox) {
                // Check if the new content would violate constraints
                const canUpdate = checkTextBoxConstraints(
                    activeTextBox,
                    content,
                    currentTextBox.position,
                )

                if (canUpdate) {
                    // Update the textbox content
                    setTextBoxes((prev) =>
                        prev.map((box) => (box.id === activeTextBox ? { ...box, content } : box)),
                    )
                } else {
                    // Prevent the change by reverting to previous content
                    if (textRefs.current[activeTextBox]) {
                        textRefs.current[activeTextBox].value = currentTextBox.content
                    }
                }
            }
        }
    }

    const deleteTextBox = (textBoxId) => {
        setTextBoxes((prev) => prev.filter((box) => box.id !== textBoxId))
        // Clean up the ref
        if (textRefs.current[textBoxId]) {
            delete textRefs.current[textBoxId]
        }
        if (activeTextBox === textBoxId) {
            setActiveTextBox(null)
            setIsEditing(false)
        }
    }

    // Function to calculate text box dimensions based on content
    const calculateTextBoxDimensions = (content, fontSize = 20, maxWidth = 380) => {
        if (!content || content.trim() === "") {
            return { width: 60, height: fontSize * 1.2 }
        }

        const lines = content.split("\n")
        const charWidth = fontSize * 0.6 // Character width estimation
        const lineHeight = fontSize * 1.2 // Line height

        // Calculate width needed for each line
        let totalLines = 0
        let maxCalculatedWidth = 60

        lines.forEach((line) => {
            const lineWidth = line.length * charWidth
            if (lineWidth <= maxWidth) {
                // Line fits in one row
                totalLines += 1
                maxCalculatedWidth = Math.max(maxCalculatedWidth, lineWidth)
            } else {
                // Line needs to wrap
                const wrappedLines = Math.ceil(lineWidth / maxWidth)
                totalLines += wrappedLines
                maxCalculatedWidth = maxWidth
            }
        })

        const width = Math.min(maxCalculatedWidth, maxWidth)
        const height = Math.max(totalLines * lineHeight, fontSize * 1.2)

        return { width, height }
    }

    // Function to check if two rectangles overlap
    const checkOverlap = (rect1, rect2) => {
        return !(
            rect1.right < rect2.left ||
            rect2.right < rect1.left ||
            rect1.bottom < rect2.top ||
            rect2.bottom < rect1.top
        )
    }

    // Function to check if text box would go out of preview container bounds
    const checkTextBoxConstraints = (textBoxId, content, position) => {
        if (!canvasRef.current) return true // Allow if canvas not ready
        if (!content || content.trim() === "") return true // Allow empty content

        const canvasRect = canvasRef.current.getBoundingClientRect()
        const dimensions = calculateTextBoxDimensions(content)

        // Convert percentage position to pixels
        const pixelX = (position.x / 100) * canvasRect.width
        const pixelY = (position.y / 100) * canvasRect.height

        // Calculate text box bounds (centered)
        const textBoxRect = {
            left: pixelX - dimensions.width / 2,
            top: pixelY - dimensions.height / 2,
            right: pixelX + dimensions.width / 2,
            bottom: pixelY + dimensions.height / 2,
        }

        // Only constraint: textbox must stay within preview container bounds
        if (
            textBoxRect.left < 0 ||
            textBoxRect.top < 0 ||
            textBoxRect.right > canvasRect.width ||
            textBoxRect.bottom > canvasRect.height
        ) {
            return false
        }

        return true
    }

    const handleSubmit = async () => {
        // Don't submit if file validation failed
        if (!isValidFile) {
            return
        }

        let finalImage = null

        if (selectedFile) {
            // For GIFs and videos, use original file without cropping
            if (selectedFile.type === "image/gif" || selectedFile.type.startsWith("video/")) {
                finalImage = selectedFile
            }
            // For static images, crop if cropping was done
            else if (selectedFile.type.startsWith("image/") && croppedAreaPixels) {
                try {
                    // Get cropped image as File object
                    finalImage = await getCroppedImg(imageSrc, croppedAreaPixels, true)
                } catch (error) {
                    console.error("Error cropping image:", error)
                    return
                }
            }
            // For static images without cropping, use original file
            else if (selectedFile.type.startsWith("image/")) {
                finalImage = selectedFile
            }
        }

        console.log("final file:", finalImage)

        const storyData = {
            file: finalImage,
            textBoxes: textBoxes.filter((box) => box.content.trim() !== ""),
            drawings: paths,
            // Only include crop data for static images that were actually cropped
            cropData:
                selectedFile &&
                selectedFile.type.startsWith("image/") &&
                selectedFile.type !== "image/gif" &&
                croppedAreaPixels
                    ? {
                          x: croppedAreaPixels.x,
                          y: croppedAreaPixels.y,
                          width: croppedAreaPixels.width,
                          height: croppedAreaPixels.height,
                          zoom: zoom,
                      }
                    : null,
        }

        try {
            await createStoryMutation.mutateAsync(storyData)
            handleClose()
        } catch (error) {
            console.error("Error creating story:", error)
            // Show error message to user
            if (error.response?.data?.message) {
                setValidationError(error.response.data.message)
                setIsValidFile(false)
            }
        }
    }

    const handleClose = () => {
        setSelectedFile(null)
        setImageSrc(null)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setMinZoom(1)
        setCroppedAreaPixels(null)
        setTextMode(false)
        setTextBoxes([])
        setActiveTextBox(null)
        setIsDragging(false)
        setDragStart(null)
        setIsEditing(false)
        setPaintMode(false)
        setSelectedColor("#ffffff")
        setIsDrawing(false)
        setPaths([])
        setCurrentPath([])
        setValidationError(null)
        setIsValidFile(true)
        // Clean up all text refs
        textRefs.current = {}
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
        onClose()
    }

    const styles = {
        container: {
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            backgroundColor: "#000",
            position: "relative",
            overflow: "hidden",
        },
        header: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        },
        headerButton: {
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            fontSize: "1.2rem",
            transition: "background-color 0.2s",
        },
        canvas: {
            flex: 1,
            position: "relative",
            backgroundColor: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            aspectRatio: "9/16",
            maxHeight: "100vh",
            width: isMobile ? "100vw" : "min(100vh * 9/16, 450px)",
            margin: "0 auto",
            overflow: "hidden",
        },
        cropperContainer: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
        },
        uploadPrompt: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            cursor: "pointer",
            padding: "20px",
            color: "#666",
        },
        uploadIcon: {
            width: "80px",
            height: "80px",
            marginBottom: "12px",
        },
        uploadText: {
            fontSize: "16px",
            margin: 0,
        },
        hiddenInput: {
            display: "none",
        },
        textOverlay: {
            position: "absolute",
            transform: "translate(-50%, -50%)",
            color: "#fff",
            fontSize: isMobile ? "20px" : "24px",
            fontWeight: "bold",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            zIndex: 15,
            minWidth: "60px",
            maxWidth: isMobile ? "80%" : "70%",
            textAlign: "center",
            padding: "8px 12px",
            borderRadius: "8px",
            outline: "none",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
        colorPalette: {
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: isMobile ? "4px" : "6px",
            padding: isMobile ? "4px 8px" : "6px 10px",
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: "20px",
            zIndex: 25,
            maxWidth: isMobile ? "calc(100vw - 32px)" : "calc(min(100vw, 450px) - 32px)",
            width: "auto",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
        },
        colorButton: {
            width: isMobile ? "24px" : "28px",
            height: isMobile ? "24px" : "28px",
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.3)",
            cursor: "pointer",
            transition: "transform 0.2s",
            flexShrink: 0,
        },
        drawingCanvas: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: paintMode ? "auto" : "none",
            zIndex: 10,
        },
        canvasTextButton: {
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            fontSize: "1.2rem",
            transition: "background-color 0.2s",
            zIndex: 20,
        },

        submitButton: {
            position: "absolute",
            bottom: "20px",
            right: "20px",
            backgroundColor: "#0095f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background-color 0.2s",
        },
    }

    const isImage = selectedFile && selectedFile.type.startsWith("image/")
    const isVideo = selectedFile && selectedFile.type.startsWith("video/")
    const isGif = selectedFile && selectedFile.type === "image/gif"
    const isStaticImage = isImage && !isGif

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            fullScreen={isMobile}
            maxWidth={false}
            PaperProps={{
                style: {
                    backgroundColor: "#000",
                    margin: 0,
                    maxHeight: "100vh",
                    width: isMobile ? "100vw" : "auto",
                    height: isMobile ? "100vh" : "auto",
                },
            }}
            sx={{
                "& .MuiDialog-container": {
                    alignItems: "center",
                    justifyContent: "center",
                },
                "& .MuiBackdrop-root": {
                    backgroundColor: "rgba(128, 128, 128, 0.8)",
                },
            }}
        >
            <style>
                {`
                    .color-palette-scrollable::-webkit-scrollbar {
                        display: none;
                    }
                `}
            </style>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <button
                        style={styles.headerButton}
                        onClick={handleClose}
                    >
                        ×
                    </button>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button
                            style={{
                                ...styles.headerButton,
                                backgroundColor: paintMode
                                    ? "rgba(255,255,255,0.4)"
                                    : "rgba(255,255,255,0.2)",
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                setPaintMode(!paintMode)
                                setTextMode(false)
                                setIsEditing(false)
                                setActiveTextBox(null)
                            }}
                        >
                            <FiEdit3 />
                        </button>
                        <button
                            style={{
                                ...styles.headerButton,
                                backgroundColor: "rgba(255,255,255,0.2)",
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                fileInputRef.current?.click()
                            }}
                        >
                            <FiImage />
                        </button>
                    </div>
                </div>

                {/* Color Palette */}
                {paintMode && (
                    <div
                        className='color-palette-scrollable'
                        style={styles.colorPalette}
                    >
                        {[
                            "#ffffff",
                            "#ff0000",
                            "#00ff00",
                            "#0000ff",
                            "#ffff00",
                            "#ff00ff",
                            "#00ffff",
                            "#000000",
                        ].map((color) => (
                            <div
                                key={color}
                                style={{
                                    ...styles.colorButton,
                                    backgroundColor: color,
                                    border:
                                        selectedColor === color
                                            ? "3px solid #fff"
                                            : "2px solid rgba(255,255,255,0.3)",
                                    transform: selectedColor === color ? "scale(1.1)" : "scale(1)",
                                }}
                                onClick={() => setSelectedColor(color)}
                            />
                        ))}

                        {/* Eraser Button */}
                        <div
                            style={{
                                ...styles.colorButton,
                                backgroundColor: "rgba(255,255,255,0.2)",
                                border:
                                    selectedColor === "eraser"
                                        ? "3px solid #fff"
                                        : "2px solid rgba(255,255,255,0.3)",
                                transform: selectedColor === "eraser" ? "scale(1.1)" : "scale(1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                color: "#fff",
                            }}
                            onClick={() => setSelectedColor("eraser")}
                            title='Eraser'
                        >
                            🧽
                        </div>

                        {/* Cancel/Clear Selection Button */}
                        <div
                            style={{
                                ...styles.colorButton,
                                backgroundColor: "rgba(255,0,0,0.3)",
                                border: "2px solid rgba(255,255,255,0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                color: "#fff",
                            }}
                            onClick={() => {
                                setPaintMode(false)
                                setSelectedColor("#ffffff")
                            }}
                            title='Cancel Paint Mode'
                        >
                            ✕
                        </div>
                    </div>
                )}

                {/* Canvas */}
                <div
                    ref={canvasRef}
                    style={{
                        ...styles.canvas,
                        cursor: paintMode ? "crosshair" : "default",
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onMouseDown={handleMouseDown}
                    onClick={handleCanvasClick}
                >
                    {/* Text Button on Canvas */}
                    <button
                        style={{
                            ...styles.canvasTextButton,
                            backgroundColor: textMode
                                ? "rgba(255,255,255,0.4)"
                                : "rgba(255,255,255,0.2)",
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            const newTextMode = !textMode
                            setTextMode(newTextMode)
                            setPaintMode(false)
                            if (!newTextMode) {
                                setIsEditing(false)
                                setActiveTextBox(null)
                            }
                        }}
                    >
                        <FiType />
                    </button>
                    {validationError ? (
                        <div
                            style={{
                                ...styles.uploadPrompt,
                                backgroundColor: "rgba(255, 0, 0, 0.1)",
                                border: "2px solid rgba(255, 0, 0, 0.3)",
                            }}
                            onClick={() => !textMode && fileInputRef.current?.click()}
                        >
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "48px", marginBottom: "10px" }}>⚠️</div>
                                <p
                                    style={{
                                        ...styles.uploadText,
                                        color: "#ff4757",
                                        marginBottom: "10px",
                                    }}
                                >
                                    {validationError}
                                </p>
                                <p style={{ ...styles.uploadText, fontSize: "14px", opacity: 0.8 }}>
                                    Tap to try again
                                </p>
                            </div>
                        </div>
                    ) : imageSrc && isStaticImage ? (
                        <div style={styles.cropperContainer}>
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={9 / 16}
                                onCropChange={onCropChange}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                onMediaLoaded={onMediaLoaded}
                                objectFit='cover'
                                showGrid={false}
                                zoomSpeed={0.4}
                                minZoom={minZoom}
                                maxZoom={3}
                                restrictPosition={true}
                                cropShape='rect'
                                cropSizePercent={100}
                            />
                        </div>
                    ) : imageSrc && isGif ? (
                        <img
                            src={imageSrc}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                            alt='GIF preview'
                        />
                    ) : imageSrc && isVideo ? (
                        <video
                            src={videoUrlRef.current}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                            autoPlay
                            muted
                            loop
                        />
                    ) : (
                        <div
                            style={styles.uploadPrompt}
                            onClick={() => !textMode && fileInputRef.current?.click()}
                        >
                            {!textMode && (
                                <>
                                    <FiImage style={styles.uploadIcon} />
                                    <p style={styles.uploadText}>Tap to add photo or video</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Drawing SVG */}
                    <svg
                        ref={svgRef}
                        style={styles.drawingCanvas}
                        viewBox='0 0 100 100'
                        preserveAspectRatio='none'
                    >
                        {/* Completed paths */}
                        {paths.map((pathData, index) => (
                            <polyline
                                key={index}
                                points={pathData.path
                                    .map((point) => `${point.x},${point.y}`)
                                    .join(" ")}
                                fill='none'
                                stroke={pathData.color}
                                strokeWidth='0.5'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        ))}
                        {/* Current path being drawn */}
                        {currentPath.length > 0 && (
                            <polyline
                                points={currentPath
                                    .map((point) => `${point.x},${point.y}`)
                                    .join(" ")}
                                fill='none'
                                stroke={selectedColor}
                                strokeWidth='0.5'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        )}
                    </svg>

                    {/* Text Boxes */}
                    {textBoxes.map((textBox) => (
                        <div
                            key={textBox.id}
                            style={{
                                ...styles.textOverlay,
                                left: `${textBox.position.x}%`,
                                top: `${textBox.position.y}%`,
                                cursor: isEditing && activeTextBox === textBox.id ? "text" : "move",
                                border:
                                    isEditing && activeTextBox === textBox.id
                                        ? "2px solid rgba(255,255,255,0.8)"
                                        : "2px solid transparent",
                                backgroundColor:
                                    isEditing && activeTextBox === textBox.id
                                        ? "rgba(0,0,0,0.4)"
                                        : "transparent",
                                width: "auto",
                                height: "auto",
                                minWidth: "100px",
                                maxWidth: "400px",
                                display: "inline-block",
                                overflow: "visible",
                            }}
                            onMouseDown={(e) => handleTextContainerMouseDown(e, textBox.id)}
                            onClick={(e) => handleTextClick(e, textBox.id)}
                        >
                            {isEditing && activeTextBox === textBox.id ? (
                                <textarea
                                    ref={(el) => {
                                        if (el) {
                                            textRefs.current[textBox.id] = el
                                        }
                                    }}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        outline: "none",
                                        color: "inherit",
                                        fontSize: "inherit",
                                        fontWeight: "inherit",
                                        textShadow: "inherit",
                                        textAlign: "inherit",
                                        resize: "none",
                                        overflow: "hidden",
                                        width: "auto",
                                        minWidth: "60px",
                                        maxWidth: isMobile ? "300px" : "400px",
                                        minHeight: "1.2em",
                                        height: "auto",
                                        fontFamily: "inherit",
                                        whiteSpace: "pre-wrap",
                                        wordWrap: "break-word",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                    }}
                                    value={textBox.content}
                                    onChange={(e) => {
                                        handleTextChange(e.target.value)
                                    }}
                                    onInput={(e) => {
                                        // Auto-resize textarea on input
                                        e.target.style.height = "auto"
                                        e.target.style.height =
                                            Math.max(e.target.scrollHeight, 24) + "px"
                                        e.target.style.width = "auto"
                                        e.target.style.width =
                                            Math.min(
                                                Math.max(e.target.scrollWidth + 10, 60),
                                                isMobile ? 300 : 400,
                                            ) + "px"
                                    }}
                                    onFocus={(e) => {
                                        // Ensure proper sizing when focused
                                        setTimeout(() => {
                                            e.target.style.height = "auto"
                                            e.target.style.height =
                                                Math.max(e.target.scrollHeight, 24) + "px"
                                            e.target.style.width = "auto"
                                            e.target.style.width =
                                                Math.min(
                                                    Math.max(e.target.scrollWidth + 10, 60),
                                                    isMobile ? 300 : 400,
                                                ) + "px"
                                        }, 0)
                                    }}
                                    placeholder='Type your text...'
                                    onBlur={() => handleTextBlur(textBox.id)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    autoFocus
                                />
                            ) : (
                                <div
                                    style={{
                                        minHeight: "1.2em",
                                        width: "auto",
                                        minWidth: "60px",
                                        maxWidth: isMobile ? "300px" : "400px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        position: "relative",
                                        whiteSpace: "pre-wrap",
                                        wordWrap: "break-word",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                        padding: "4px 8px",
                                    }}
                                >
                                    {textBox.content || "Tap to add text"}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*,video/*'
                        style={styles.hiddenInput}
                        onChange={handleFileChange}
                    />
                </div>

                {/* Submit Button */}
                {(selectedFile ||
                    textBoxes.some((box) => box.content.trim() !== "") ||
                    paths.length > 0) && (
                    <button
                        style={{
                            ...styles.submitButton,
                            opacity: createStoryMutation.isPending || !isValidFile ? 0.7 : 1,
                            backgroundColor: !isValidFile
                                ? "#666"
                                : styles.submitButton.backgroundColor,
                        }}
                        onClick={handleSubmit}
                        disabled={createStoryMutation.isPending || !isValidFile}
                    >
                        {createStoryMutation.isPending
                            ? "Sharing..."
                            : !isValidFile
                              ? "Fix errors to share"
                              : "Share"}
                    </button>
                )}
            </div>
        </Dialog>
    )
}

export default StoryModal
