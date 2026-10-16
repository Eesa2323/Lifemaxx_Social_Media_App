import React from "react"
import { useNavigate } from "react-router-dom"

const MentionText = ({ text, style = {} }) => {
    const navigate = useNavigate()

    if (!text) return null

    // Split text by mentions (@username)
    const parts = text.split(/(@\w+)/g)

    const handleMentionClick = (username) => {
        // Remove the @ symbol
        const cleanUsername = username.substring(1)
        navigate(`/profile/${cleanUsername}`)
    }

    return (
        <span style={style}>
            {parts.map((part, index) => {
                if (part.startsWith("@")) {
                    return (
                        <span
                            key={index}
                            onClick={() => handleMentionClick(part)}
                            style={{
                                color: "#0095f6",
                                cursor: "pointer",
                                fontWeight: "500",
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.textDecoration = "underline"
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.textDecoration = "none"
                            }}
                        >
                            {part}
                        </span>
                    )
                }
                return <span key={index}>{part}</span>
            })}
        </span>
    )
}

export default MentionText
