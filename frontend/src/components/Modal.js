import React from "react"
import { Modal as MuiModal, Box, useMediaQuery } from "@mui/material"

const Modal = ({ isOpen, onClose, children, fullScreen, style, hideCloseButton }) => {
    const isMobile = useMediaQuery("(max-width: 768px)")
    const isFullScreen = fullScreen || isMobile

    const baseSx = {
        ...styles.modal,
        ...(isFullScreen ? styles.fullScreen : {}),
    }

    return (
        <MuiModal
            open={isOpen}
            onClose={onClose}
            sx={styles.muiModal}
        >
            <Box
                sx={baseSx}
                style={style}
                onClick={(e) => e.stopPropagation()}
            >
                {!hideCloseButton && (
                    <button
                        onClick={onClose}
                        style={styles.closeButton}
                    >
                        ×
                    </button>
                )}
                {children}
            </Box>
        </MuiModal>
    )
}

const styles = {
    muiModal: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        "& .MuiBackdrop-root": {
            backgroundColor: "rgba(0, 0, 0, 0.85)",
        },
    },
    modal: {
        backgroundColor: "#1a1a1a",
        borderRadius: "12px",
        maxWidth: "90%",
        maxHeight: "90vh",
        overflow: "auto",
        position: "relative",
        width: "600px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        outline: "none",
        "&:focus-visible": {
            outline: "none",
        },
    },
    fullScreen: {
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100vh",
        borderRadius: 0,
        margin: 0,
        border: "none",
        boxShadow: "none",
        background: "linear-gradient(to bottom, #1a1a1a, #0f0f0f)",
        position: "relative",
        "&::after": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
                "linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent)",
        },
    },
    closeButton: {
        position: "absolute",
        right: "10px",
        top: "0px",
        background: "none",
        border: "none",
        fontSize: "1.5rem",
        color: "#fff",
        cursor: "pointer",
        padding: "0.2rem",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        transition: "background-color 0.2s",
        zIndex: 10,
    },
}

export default Modal
