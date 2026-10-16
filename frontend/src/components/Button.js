import React from "react"
import { SMALL_SCREEN_SIZE } from "../utils/config"
import { useMediaQuery } from "react-responsive"

const Button = ({ onClick, disabled, children, style = {} }) => {
    const [width, setWidth] = React.useState(window.innerWidth)
    const [isHovered, setIsHovered] = React.useState(false)
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })

    React.useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const buttonStyles = {
        ...styles.button,
        ...(disabled ? styles.disabled : {}),
        ...(isHovered && !disabled ? styles.hover : {}),
        fontSize: isMobile ? "0.82rem" : "0.95rem",
        ...style,
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={buttonStyles}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
        </button>
    )
}

const styles = {
    button: {
        width: "100%",
        backgroundColor: "var(--primary)",
        color: "#fff",
        border: "1px solid transparent",
        borderRadius: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontWeight: "700",
        letterSpacing: "0.3px",
        position: "relative",
        overflow: "hidden",
        padding: "0.9rem 1.2rem",
        boxShadow: "0 10px 24px rgba(0, 0, 0, 0.16)",
    },
    hover: {
        backgroundColor: "var(--primary-strong)",
        transform: "translateY(-1px)",
        boxShadow: "0 16px 30px rgba(0, 0, 0, 0.24)",
    },
    disabled: {
        opacity: 0.65,
        cursor: "not-allowed",
        backgroundColor: "var(--surface-strong)",
        color: "var(--text-muted)",
        transform: "none",
        boxShadow: "none",
    },
}

export default Button
