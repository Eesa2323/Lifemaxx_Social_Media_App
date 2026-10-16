const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener("load", () => resolve(image))
        image.addEventListener("error", (error) => reject(error))
        image.src = url
    })

const getCroppedImg = async (imageSrc, pixelCrop, returnAsFile = false) => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
        return null
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    )

    if (returnAsFile) {
        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    const file = new File([blob], "cropped-image.jpg", {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    })
                    resolve(file)
                },
                "image/jpeg",
                0.95
            )
        })
    }

    return canvas.toDataURL("image/jpeg")
}

export default getCroppedImg
