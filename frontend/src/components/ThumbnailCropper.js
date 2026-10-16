import React, { useCallback, useEffect, useState } from "react"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import Cropper from "react-easy-crop"
import { useMediaQuery } from "react-responsive"

// Utility to create an HTMLImageElement from a URL
const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener("load", () => resolve(image))
        image.addEventListener("error", (error) => reject(error))
        image.setAttribute("crossOrigin", "anonymous") // to avoid CORS issues on canvas
        image.src = url
    })

// Get cropped image blob using canvas (square output 100x100 by default)
async function getCroppedImg(imageSrc, pixelCrop, outputSize = 100, mimeType = "image/jpeg") {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    // Square output
    canvas.width = outputSize
    canvas.height = outputSize

    // Draw the cropped area scaled to fit outputSize
    // pixelCrop = { x, y, width, height } in pixels of the original image
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        outputSize,
        outputSize
    )

    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                resolve(blob)
            },
            mimeType,
            0.92
        )
    })
}

const ThumbnailCropper = ({ open, imageSrc, onClose, onCropped, outputSize = 100 }) => {
    const isMobile = useMediaQuery({ maxWidth: 768 })
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

    useEffect(() => {
        if (!open) {
            setCrop({ x: 0, y: 0 })
            setZoom(1)
            setCroppedAreaPixels(null)
        } else {
            // Slightly higher default zoom on mobile so the image doesn't look tiny
            setZoom(isMobile ? 1.2 : 1)
        }
    }, [open, isMobile])

    const onCropComplete = useCallback((_croppedArea, pixels) => {
        setCroppedAreaPixels(pixels)
    }, [])

    const handleConfirm = useCallback(async () => {
        if (!imageSrc || !croppedAreaPixels) return
        const blob = await getCroppedImg(imageSrc, croppedAreaPixels, outputSize)
        onCropped?.(blob)
    }, [imageSrc, croppedAreaPixels, outputSize, onCropped])

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={isMobile ? false : "sm"}
            fullWidth={!isMobile}
            fullScreen={isMobile}
            PaperProps={{
                style: {
                    backgroundColor: "#000",
                    color: "#fff",
                },
            }}
        >
            <DialogTitle style={{ borderBottom: "1px solid #333", color: "#fff" }}>
                Crop thumbnail
            </DialogTitle>
            <DialogContent
                style={{
                    position: "relative",
                    height: isMobile ? "70vh" : 420,
                    backgroundColor: "#000",
                    padding: 0,
                }}
            >
                {!!imageSrc && (
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        restrictPosition={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        objectFit='contain'
                        zoomWithScroll
                    />
                )}
            </DialogContent>
            {null}
            <DialogActions style={{ borderTop: "1px solid #333" }}>
                <Button
                    onClick={onClose}
                    style={{ color: "#aaa" }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant='contained'
                    style={{ background: "var(--primary)" }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default ThumbnailCropper
