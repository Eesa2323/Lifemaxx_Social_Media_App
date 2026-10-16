import React from "react"
import { Box } from "@mui/material"
import { BiPlay } from "react-icons/bi"

const Preview = ({ previewData, handleRemoveMessageFile }) => {
    return (
        previewData.type && (
            <div style={styles.containerStyle}>
                <Box
                    onClick={handleRemoveMessageFile}
                    sx={styles.removePreviewContainer}
                >
                    <button style={styles.closeButton}>×</button>{" "}
                </Box>

                {previewData.type === "image" && previewData.url && (
                    <img
                        src={previewData.url}
                        alt='Preview img'
                        style={styles.imageStyle}
                    />
                )}

                {previewData.type === "video" && (
                    <div style={styles.videoPreviewStyle}>
                        <BiPlay style={styles.playIcon} />
                    </div>
                )}
            </div>
        )
    )
}

const styles = {
    removePreviewContainer: {
        backgroundColor: "var(--darkGrey2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        border: "1px solid var(--lightGrey)",
        margin: "2px 2px 2px 2px",
        position: "absolute",
        top: 0,
        right: 0,
        width: 20,
        height: 20,
        cursor: "pointer",
        zIndex: 10,
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
    },
    closeButton: {
        background: "none",
        border: "none",
        fontSize: "14px",
        color: "#fff",
        cursor: "pointer",
        padding: 0,
        margin: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        lineHeight: 1,
    },
    containerStyle: {
        position: "relative",
        margin: "0 0 2px 5px",
        borderRadius: 10,
        backgroundColor: "black",
        border: "1px solid var(--darkGrey2)",
        zIndex: 100,
        width: 100,
        height: 100,
    },
    imageStyle: {
        background: "var(--darkGrey2)",
        objectFit: "cover",
        width: "100%",
        height: "100%",
        borderRadius: 12,
    },
    videoPreviewStyle: {
        background: "black",
        objectFit: "cover",
        width: "100%",
        height: "100%",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    playIcon: {
        fontSize: "40px",
        color: "#fff",
    },
}

export default Preview
