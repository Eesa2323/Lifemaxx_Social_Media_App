import React from "react"
import { useQuery } from "@tanstack/react-query"
import useNotifications from "../hooks/useNotifications"
import { BiBell } from "react-icons/bi"

const NotificationBadge = ({ style, shouldFillIcon, updateOpen }) => {
    const { fetchUnreadNotifcationCount } = useNotifications()
    const { data, isLoading } = useQuery({
        queryKey: ["notifications", "unread_count"],
        queryFn: fetchUnreadNotifcationCount,
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
        gcTime: Infinity,
    })
    const displayCount = data?.count > 99 ? `99+` : `${data?.count}`

    return (
        <div
            onClick={() => updateOpen(true)}
            style={styles.iconWrapper}
        >
            <BiBell
                size={22}
                color='#aaa'
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
        border: "2px solid #111",
    },
}

export default NotificationBadge
