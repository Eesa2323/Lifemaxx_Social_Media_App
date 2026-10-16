import React from "react"
import { useNavigate } from "react-router-dom"

const UnauthorizedLoginPopupModal = ({
    isOpen,
    onClose,
    title = "Login Required",
    message = "Please login to continue.",
    loginButtonText = "Login",
    cancelButtonText = "Cancel",
}) => {
    const navigate = useNavigate()

    if (!isOpen) return null

    const handleLogin = () => {
        onClose()
        navigate("/login")
    }

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 3000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "#1a1a1a",
                    padding: "24px",
                    borderRadius: "12px",
                    maxWidth: "400px",
                    width: "90%",
                    textAlign: "center",
                    border: "1px solid #333",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ color: "#fff", margin: "0 0 16px 0" }}>{title}</h3>
                <p style={{ color: "#aaa", margin: "0 0 24px 0" }}>{message}</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                        style={{
                            background: "#ff4444",
                            color: "#fff",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "600",
                        }}
                        onClick={handleLogin}
                    >
                        {loginButtonText}
                    </button>
                    <button
                        style={{
                            background: "none",
                            color: "#aaa",
                            border: "1px solid #333",
                            padding: "10px 20px",
                            borderRadius: "6px",
                            cursor: "pointer",
                        }}
                        onClick={onClose}
                    >
                        {cancelButtonText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UnauthorizedLoginPopupModal
