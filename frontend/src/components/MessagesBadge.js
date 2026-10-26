import React from "react"
import { useNavigate } from "react-router-dom"
import useChats from "../hooks/chats/useChats"
import { BiMessage } from "react-icons/bi"
import { useSelector } from "react-redux"

const MessagesBadge = () => {
    const navigate = useNavigate()
    const token = useSelector((state) => state.auth.token)
    const { useUnreadChatsQuery } = useChats()
    const { data, isLoading } = useUnreadChatsQuery(!!token)
    const displayCount = data?.count > 99 ? `99+` : `${data?.count}`

    return (
        <div
            onClick={() => navigate("/chats")}
            style={styles.iconWrapper}
        >
            <BiMessage
                size={21}
                color='var(--text-muted)'
            />
            {!isLoading && data?.count > 0 && <div style={styles.badge}>{displayCount}</div>}
        </div>
    )
}

const styles = {
    iconWrapper: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        cursor: "pointer",
        width: 22,
        height: 22,
    },
    badge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: "#ff4444",
        color: "#fff",
        borderRadius: "50%",
        minWidth: "16px",
        height: "16px",
        fontSize: "10px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        border: "2px solid var(--surface)",
    },
}

export default MessagesBadge
