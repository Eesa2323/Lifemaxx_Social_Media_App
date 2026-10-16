import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import useUsers from "../hooks/useUsers"
import ProfilePic from "./ProfilePic"

const MentionAutocomplete = ({
    isVisible,
    searchTerm,
    onSelectUser,
    onClose,
    position = { top: 0, left: 0 },
    inputRef,
    forceLowerPosition = false,
}) => {
    const { searchUsers } = useUsers()
    const popupRef = useRef(null)

    // Search for users when searchTerm changes
    const { data: users, isLoading } = useQuery({
        queryKey: ["mentionSearch", searchTerm],
        queryFn: () => searchUsers(searchTerm),
        enabled: isVisible && searchTerm.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
    })

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                popupRef.current &&
                !popupRef.current.contains(event.target) &&
                inputRef &&
                !inputRef.current?.contains(event.target)
            ) {
                onClose()
            }
        }

        if (isVisible) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isVisible, onClose, inputRef])

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === "Escape") {
                onClose()
            }
        }

        if (isVisible) {
            document.addEventListener("keydown", handleEscape)
            return () => document.removeEventListener("keydown", handleEscape)
        }
    }, [isVisible, onClose])

    if (!isVisible || !searchTerm) return null

    // Calculate popup position relative to the input
    const calculatePosition = () => {
        // Always position popup above the input/textarea
        const popupHeight = 150 // reduced height of the popup
        let top = -popupHeight - 5 // Always above with 5px gap (reduced margin)
        let left = position.left

        // Check if we need to force lower position (for JourneyViewer modal)
        if (forceLowerPosition) {
            // Position popup lower but not overlapping textarea
            top = -popupHeight + 50 // 50px lower than normal position
        }

        // Ensure popup doesn't go too far left
        if (left < 0) {
            left = 0
        }

        // Ensure popup doesn't go too far right
        const maxLeft = 300 - 200 // maxWidth - popup width
        if (left > maxLeft) {
            left = maxLeft
        }

        return { top, left }
    }

    const popupPosition = calculatePosition()

    const handleUserClick = (user) => {
        onSelectUser(user.username)
        onClose()
    }

    return (
        <div
            ref={popupRef}
            style={{
                position: "absolute",
                top: popupPosition.top,
                left: popupPosition.left,
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                zIndex: 1000,
                minWidth: "200px",
                maxWidth: "300px",
                height: "150px",
                overflowY: "auto",
            }}
        >
            {isLoading ? (
                <div
                    style={{
                        padding: "12px",
                        color: "#999",
                        textAlign: "center",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    Searching...
                </div>
            ) : users?.length > 0 ? (
                <div style={{ height: "100%", overflowY: "auto" }}>
                    {users.slice(0, 5).map((user) => (
                        <div
                            key={user._id}
                            onClick={() => handleUserClick(user)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "8px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid #333",
                                "&:hover": {
                                    backgroundColor: "#333",
                                },
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#333"
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "transparent"
                            }}
                        >
                            <ProfilePic
                                size={24}
                                story={user.latestStory}
                                userId={user._id}
                            />
                            <span
                                style={{
                                    marginLeft: "8px",
                                    color: "#fff",
                                    fontSize: "14px",
                                }}
                            >
                                {user.username}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    style={{
                        padding: "12px",
                        color: "#999",
                        textAlign: "center",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    No users found
                </div>
            )}
        </div>
    )
}

export default MentionAutocomplete
