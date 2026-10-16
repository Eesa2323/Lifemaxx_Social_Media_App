import React from "react"

const MiniPopup = ({ message, buttonText, onButtonClick, onClose }) => {
    return (
        <div
            style={styles.overlay}
            onClick={onClose}
        >
            <div
                style={styles.popup}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={styles.message}>{message}</div>
                <button
                    style={styles.button}
                    onClick={onButtonClick}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    )
}

const styles = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    },
    popup: {
        background: "#222",
        color: "#fff",
        borderRadius: 10,
        padding: "24px 32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
        minWidth: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
    },
    message: {
        fontSize: 16,
        marginBottom: 16,
        textAlign: "center",
    },
    button: {
        background: "#ff4444",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "8px 20px",
        fontSize: 15,
        cursor: "pointer",
        marginTop: 8,
    },
}

export default MiniPopup
