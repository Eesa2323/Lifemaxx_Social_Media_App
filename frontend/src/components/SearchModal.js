import UserSearch from "./UserSearch"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import useUsers from "../hooks/useUsers"
import { produce } from "immer"
import { useState } from "react"
import { useMediaQuery } from "react-responsive"
import { SMALL_SCREEN_SIZE } from "../utils/config"
import { useSelector } from "react-redux"

const SearchSidebar = ({ open, onClose, isMobile, left, sidebarWidth }) => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const {
        insertRecentHistory,
        getRecentSearchers,
        addToRecentSearchers,
        removeFromRecentSearchers,
        clearRecentSearchers,
    } = useUsers()
    const [search, setSearch] = useState("")
    const token = useSelector((state) => state.auth.token)

    const insertHistoryMutation = useMutation({
        mutationFn: ({ user }) => insertRecentHistory({ userId: user._id }),
        onMutate: (variables) => {
            const { user } = variables
            const previousSnapshot = queryClient.getQueryData(["recentHistory"])
            queryClient.setQueryData(["recentHistory"], (prevData) => {
                return produce(prevData, (draft) => {
                    if (!draft) return
                    const existingUserIndex = draft.findIndex((u) => u._id === user._id)
                    if (existingUserIndex !== -1) draft.splice(existingUserIndex, 1)
                    draft.unshift(user)
                })
            })
            return { previousSnapshot }
        },
        onError: (_, __, context) => {
            const { previousSnapshot } = context
            if (!previousSnapshot) return
            queryClient.setQueryData(["recentHistory"], previousSnapshot)
        },
    })

    // Query for recent searchers (only if authenticated)
    const { data: recentSearchers } = useQuery({
        queryKey: ["recentSearchers"],
        queryFn: getRecentSearchers,
        enabled: !!token && open,
        staleTime: 5 * 60 * 1000, // 5 minutes
    })

    const addToRecentMutation = useMutation({
        mutationFn: (userData) => addToRecentSearchers(userData._id),
        onMutate: async (userData) => {
            await queryClient.cancelQueries({ queryKey: ["recentSearchers"] })
            const previousSearchers = queryClient.getQueryData(["recentSearchers"])

            queryClient.setQueryData(["recentSearchers"], (oldData) => {
                if (!oldData) return [userData]

                // Remove if already exists
                const filtered = oldData.filter((user) => user._id !== userData._id)
                // Add to beginning
                return [userData, ...filtered].slice(0, 50)
            })

            return { previousSearchers }
        },
        onError: (err, __, context) => {
            console.log(err)

            if (context?.previousSearchers) {
                queryClient.setQueryData(["recentSearchers"], context.previousSearchers)
            }
        },
    })

    const removeFromRecentMutation = useMutation({
        mutationFn: removeFromRecentSearchers,
        onMutate: async (targetUserId) => {
            await queryClient.cancelQueries({ queryKey: ["recentSearchers"] })
            const previousSearchers = queryClient.getQueryData(["recentSearchers"])

            queryClient.setQueryData(["recentSearchers"], (oldData) => {
                if (!oldData) return []
                return oldData.filter((user) => user._id !== targetUserId)
            })

            return { previousSearchers }
        },
        onError: (_, __, context) => {
            if (context?.previousSearchers) {
                queryClient.setQueryData(["recentSearchers"], context.previousSearchers)
            }
        },
    })

    const clearRecentMutation = useMutation({
        mutationFn: clearRecentSearchers,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ["recentSearchers"] })
            const previousSearchers = queryClient.getQueryData(["recentSearchers"])

            queryClient.setQueryData(["recentSearchers"], [])

            return { previousSearchers }
        },
        onError: (_, __, context) => {
            if (context?.previousSearchers) {
                queryClient.setQueryData(["recentSearchers"], context.previousSearchers)
            }
        },
    })

    const handleUserClick = (user, _, provideUserProfileInfo = true) => {
        if (onClose) onClose()

        // Add to recent searchers if authenticated
        if (token) {
            addToRecentMutation.mutate(user)
        }

        // Only provide initial data if it's from search results, not recent searches
        const state = provideUserProfileInfo ? { userProfileInfo: user } : {}
        return navigate(`/profile/${user.username}`, { replace: true, state })
    }

    return (
        <>
            {open && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: left ? (isMobile ? 0 : sidebarWidth || 220) : undefined,
                        right: left ? undefined : 0,
                        width: isMobile ? "100vw" : 450,
                        height: "100vh",
                        background: "#000",
                        borderRight: left ? "1px solid #333" : undefined,
                        borderLeft: !left ? "1px solid #333" : undefined,
                        zIndex: 2000,
                        boxShadow: left
                            ? "2px 0 8px rgba(0,0,0,0.12)"
                            : "-2px 0 8px rgba(0,0,0,0.12)",
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.3s",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: 20,
                            borderBottom: "1px solid #222",
                        }}
                    >
                        <h3 style={{ color: "#ff4444", margin: 0 }}>Search Users</h3>
                        <button
                            onClick={onClose}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#fff",
                                fontSize: 24,
                                cursor: "pointer",
                            }}
                            aria-label='Close search'
                        >
                            <svg
                                width='24'
                                height='24'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            >
                                <line
                                    x1='18'
                                    y1='6'
                                    x2='6'
                                    y2='18'
                                />
                                <line
                                    x1='6'
                                    y1='6'
                                    x2='18'
                                    y2='18'
                                />
                            </svg>
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                        <UserSearch
                            isSearchModal={true}
                            handleClick={handleUserClick}
                            recentSearchers={recentSearchers}
                            onRemoveRecent={(targetUserId) =>
                                removeFromRecentMutation.mutate(targetUserId)
                            }
                            onClearRecent={() => clearRecentMutation.mutate()}
                        />
                    </div>
                </div>
            )}
        </>
    )
}

export default SearchSidebar
