import Spinner from "./Spinner"
import ProfilePic from "./ProfilePic"

import { IoIosRadioButtonOff as RadioUncheckedIcon } from "react-icons/io"
import debounce from "lodash/debounce"
import { IoIosRadioButtonOn as RadioCheckedIcon } from "react-icons/io"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import useUsers from "../hooks/useUsers.js"

const UserSearch = ({
    handleClick,
    searchConfig = null,
    selectedUsers = null,
    isSearchModal = false,
    recentSearchers = null,
    onRemoveRecent = null,
    onClearRecent = null,
}) => {
    const [queryData, setQueryData] = useState({ value: "", validity: false })
    const { searchUsers } = useUsers()
    const displayRecentList = !queryData.value && isSearchModal
    const { data: users, isFetching } = useQuery({
        queryKey: ["searchUsers", queryData.value],
        queryFn: () => searchUsers(queryData.value, searchConfig?.type),
        enabled: !!queryData.value && !!queryData.validity,
        retry: false,
    })

    // const { data: recentHistory, isFetching: isRecentsFetching } = useQuery({
    //     queryKey: ["recentHistory"],
    //     queryFn: getRecentHistory,
    //     enabled: displayRecentList,
    // })
    // const isFetching = displayRecentList ? isRecentsFetching : isSearchFetching

    const debouncedSetQuery = useMemo(
        () => debounce((value, validity) => setQueryData({ value, validity }), 1000),
        []
    )
    const handleInputChange = (e) => {
        const regex = /^(?:[\p{L}\p{N}_]+\.?)*[\p{L}][\p{L}\p{N}_]*$/u
        const value = e.target.value

        const validity = regex.test(value)
        debouncedSetQuery(value, validity)
    }

    return (
        <div style={{ ...styles.container, ...(isSearchModal && styles.sidebarSurface) }}>
            <input
                onChange={handleInputChange}
                placeholder='Search users...'
                style={{ ...styles.inputStyle, ...(isSearchModal && styles.sidebarInput) }}
            />

            {isFetching ? (
                <div style={styles.spinnerContainer}>
                    <Spinner
                        size={35}
                        withStyles={false}
                        noDelay={true}
                    />
                </div>
            ) : (
                <div style={{ ...styles.userListContainer, ...(isSearchModal && styles.sidebarSurface) }}>
                    {displayRecentList && recentSearchers?.length > 0 && (
                        <div style={styles.recentSection}>
                            <div style={styles.recentHeader}>
                                <span style={styles.recentTitle}>Recent searches</span>
                                <button
                                    onClick={onClearRecent}
                                    style={styles.clearButton}
                                    aria-label='Clear all recent searches'
                                >
                                    Clear all
                                </button>
                            </div>
                            <UserList
                                users={recentSearchers}
                                handleClick={handleClick}
                                isRecentList={true}
                                onRemoveUser={onRemoveRecent}
                                provideUserProfileInfo={false}
                                isSearchModal={isSearchModal}
                            />
                        </div>
                    )}

                    {queryData.value && !users?.length ? (
                        <div style={styles.noResults}>No results found</div>
                    ) : (
                        <>
                            {users?.length && (
                                <UserList
                                    type={searchConfig?.type}
                                    handleClick={handleClick}
                                    selectedUsers={selectedUsers}
                                    users={users}
                                    isSearchModal={isSearchModal}
                                />
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export const UserList = ({
    users,
    handleClick,
    selectedUsers = null,
    type = null,
    isRecentList = false,
    onRemoveUser = null,
    provideUserProfileInfo = true,
    isSearchModal = false,
}) => {
    return users?.map((user) => {
        const shouldShowSelectButton = !!selectedUsers

        const isDisabled = type === "post_tags" ? !user.canTag : false
        const isSelected = shouldShowSelectButton && selectedUsers.find((u) => u._id === user._id)
        const RadioIcon = isSelected ? RadioCheckedIcon : RadioUncheckedIcon

        return (
            <div
                key={user._id}
                style={{
                    ...styles.userItem,
                    ...(isSearchModal && styles.sidebarUserItem),
                    ...(shouldShowSelectButton && { maxWidth: "100%" }),
                }}
            >
                <ProfilePic
                    size={40}
                    story={user.latestStory}
                    userId={user._id}
                />

                <span
                    className='roboto-medium'
                    style={{
                        ...styles.userItemText,
                        ...(isDisabled && { color: "var(--lightGrey)" }),
                    }}
                    onClick={() => {
                        if (isDisabled) return
                        handleClick?.(user, isSelected, provideUserProfileInfo)
                    }}
                >
                    {user.username}
                </span>

                {isRecentList && onRemoveUser && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemoveUser(user._id)
                        }}
                        style={styles.removeButton}
                        aria-label={`Remove ${user.username} from recent searches`}
                    >
                        <svg
                            width='16'
                            height='16'
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
                            ></line>
                            <line
                                x1='6'
                                y1='6'
                                x2='18'
                                y2='18'
                            ></line>
                        </svg>
                    </button>
                )}

                {selectedUsers && (
                    <RadioIcon
                        onClick={() => handleClick?.(user, isSelected)}
                        style={{ width: 28, height: 28, marginLeft: "auto" }}
                    />
                )}
            </div>
        )
    })
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "black",
    },
    sidebarSurface: {
        backgroundColor: "var(--surface)",
    },
    sidebarInput: {
        backgroundColor: "var(--surface-strong)",
        borderColor: "var(--border)",
        color: "var(--text)",
    },
    sidebarUserItem: {
        backgroundColor: "var(--surface-soft)",
        color: "var(--text)",
    },
    modalBody: {
        backgroundColor: "black",
        maxHeight: "100vh",
    },
    modalHeader: {
        backgroundColor: "black",
        borderBottom: "1px solid var(--lightGrey)",
    },
    spinnerContainer: {
        marginTop: 50,
        display: "flex",
        justifyContent: "center",
    },
    userListContainer: {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        marginTop: 20,
        gap: 16,
        flex: 1,
        overflow: "auto",
        padding: "0 4px",
        backgroundColor: "black",
    },
    noResults: {
        textAlign: "center",
        color: "#999",
        fontSize: "16px",
        marginTop: "60px",
        marginBottom: "auto",
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    userItem: {
        maxWidth: "100%",
        display: "flex",
        flexDirection: "row",
        padding: "12px 16px",
        marginTop: 12,
        borderRadius: "8px",
        backgroundColor: "#222",
        transition: "background-color 0.2s ease",
        cursor: "pointer",
        "&:hover": {
            backgroundColor: "#333",
        },
    },
    userItemText: {
        margin: "10px 0 0 14px",
        fontSize: "16px",
        color: "#fff",
        flex: 1,
    },
    inputStyle: {
        width: "100%",
        backgroundColor: "#111",
        border: "1px solid #333",
        height: "48px",
        fontSize: "16px",
        borderRadius: "8px",
        padding: "0 16px",
        color: "#fff",
        outline: "none",
        transition: "border-color 0.2s ease",
        "&:focus": {
            borderColor: "#046bc5",
            backgroundColor: "#1a1a1a",
        },
        "&::placeholder": {
            color: "#666",
        },
    },
    recentSection: {
        marginBottom: "20px",
    },
    recentHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
        padding: "0 4px",
    },
    recentTitle: {
        color: "#999",
        fontSize: "14px",
        fontWeight: "500",
    },
    clearButton: {
        background: "none",
        border: "none",
        color: "#ff4444",
        fontSize: "12px",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "4px",
        transition: "background-color 0.2s ease",
        "&:hover": {
            backgroundColor: "rgba(255, 68, 68, 0.1)",
        },
    },
    removeButton: {
        background: "none",
        border: "none",
        color: "#666",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "4px",
        marginLeft: "auto",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "&:hover": {
            color: "#ff4444",
            backgroundColor: "rgba(255, 68, 68, 0.1)",
        },
    },
}

export default UserSearch
