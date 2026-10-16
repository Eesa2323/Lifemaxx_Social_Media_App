const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const BASE_UPLOADS_DIR = path.join(__dirname, "..", "uploads")

async function uploadToLocal(file, type) {
    try {
        console.log("uploadToLocal - Starting upload for type:", type)
        console.log("uploadToLocal - File name:", file.name)
        console.log("uploadToLocal - File size:", file.size)
        console.log("uploadToLocal - File mimetype:", file.mimetype)
        console.log("uploadToLocal - Has file.data:", !!file.data)
        console.log("uploadToLocal - Has file.tempFilePath:", !!file.tempFilePath)

        const uploadsDir = path.join(BASE_UPLOADS_DIR, type)
        console.log("uploadToLocal - Upload directory:", uploadsDir)

        // Create directory if it doesn't exist
        await fs.promises.mkdir(uploadsDir, { recursive: true })

        // Generate random filename with original extension
        const fileExtension = path.extname(file.name)
        const randomId = crypto.randomUUID()
        const fileName = `${randomId}${fileExtension}`
        const filePath = path.join(uploadsDir, fileName)

        console.log("uploadToLocal - Target file path:", filePath)

        // Handle both temp file and buffer approaches
        if (file.tempFilePath) {
            // Move temp file to final location
            console.log("uploadToLocal - Moving temp file from:", file.tempFilePath)
            await fs.promises.rename(file.tempFilePath, filePath)
        } else if (file.data) {
            // Write buffer data to file
            console.log("uploadToLocal - Writing buffer data, length:", file.data.length)
            await fs.promises.writeFile(filePath, file.data)
        } else {
            throw new Error("No file data or temp file path available")
        }

        // Verify the file was written correctly
        const stats = await fs.promises.stat(filePath)
        console.log("uploadToLocal - Final file size:", stats.size)

        if (stats.size === 0) {
            throw new Error("File was saved but has zero size")
        }

        return `/uploads/${type}/${fileName}`
    } catch (error) {
        console.error("uploadToLocal - Error:", error)
        throw new Error(`Failed to save file locally: ${error.message}`)
    }
}

module.exports = {
    uploadToLocal,
}
