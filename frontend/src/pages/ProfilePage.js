import React, { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import ProfilePic from "../components/ProfilePic"
import Spinner from "../components/Spinner"
import SubmitButton from "../components/Button"
import { useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import useUsers from "../hooks/useUsers"
import { produce } from "immer"
import { BASE_URL, SMALL_SCREEN_SIZE } from "../utils/config"
import JourneyGallery from "../components/JourneyGallery"
import { useMediaQuery } from "react-responsive"
import Modal from "../components/Modal"
import SettingsModal from "../components/SettingsModal"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import CreateJourneyModal from "../components/CreateJourneyModal"
import UnauthorizedLoginPopupModal from "../components/UnauthorizedLoginPopupModal"
import UserList from "../components/UserList"
import { useInView } from "react-intersection-observer"
import { BsThreeDots } from "react-icons/bs"
import axios from "axios"

const CATEGORIES = [
    { id: "Fitness", title: "Fitness", icon: "💪" },
    { id: "Money", title: "Money", icon: "💼" },
    { id: "Self-Improvement", title: "Self-Improvement", icon: "🎯" },
    { id: "Looksmaxxing", title: "Looksmaxxing", icon: "✨" },
]

const UserSkeleton = () => (
    <div style={styles.userSkeleton}>
        <div style={styles.skeletonAvatar}></div>
        <div style={styles.skeletonContent}>
            <div style={styles.skeletonLine}></div>
            <div style={styles.skeletonLineSmall}></div>
        </div>
    </div>
)

const ProfilePage = () => {
    const { username } = useParams()
    return <ProfilePageComponent key={username} />
}

const ProfilePageComponent = () => {
    const { username } = useParams()
    const { state } = useLocation()
    const { userProfileInfo, isPartialProfileData = false } = state || {}
    const { followUser, useProfileQuery, blockUser, unblockUser } = useUsers()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const userData = useSelector((state) => state.auth.userData)
    const token = useSelector((state) => state.auth.token)
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [showOptionsModal, setShowOptionsModal] = useState(false)

    const {
        data: profileInfo,
        isFetching,
        error,
    } = useProfileQuery(username, true, !isPartialProfileData && userProfileInfo && userProfileInfo)

    const followMutation = useMutation({
        mutationFn: ({ type, userId }) => followUser({ type, userId }),
        onMutate: async () => await queryClient.cancelQueries({ queryKey: ["profile", username] }),
        onSuccess: (data) => {
            const { type, private: isPrivate } = data

            queryClient.setQueryData(["profile", username], (prevData) => {
                return produce(prevData, (draft) => {
                    if (!prevData) return draft

                    if (type === "follow") {
                        const propertyToUpdate = isPrivate ? "isRequested" : "isFollowing"
                        draft[propertyToUpdate] = true
                    } else {
                        Object.assign(draft, { isFollowing: false, isRequested: false })
                    }
                })
            })
        },
        onError: (error) => console.log(error),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["stories", profileInfo?._id] })
            queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
        },
    })

    const blockMutation = useMutation({
        mutationFn: ({ targetUserId }) => blockUser({ targetUserId }),
        onMutate: async () => await queryClient.cancelQueries({ queryKey: ["profile", username] }),
        onSuccess: (data, vars) => {
            const { targetUserInfo } = vars

            queryClient.setQueryData(["profile", username], (prevData) => {
                return produce(prevData, (draft) => {
                    if (!prevData) return draft

                    draft.isBlocked = true
                })
            })

            console.log(data)

            queryClient.setQueryData(["blocked-users"], (prevData) => {
                return produce(prevData, (draft) => {
                    const page = draft?.pages?.[0]
                    if (!page) return draft

                    draft.pages[0].data.unshift({
                        _id: targetUserInfo._id,
                        blockedUser: targetUserInfo,
                    })
                })
            })
        },
        onError: (error) => {
            console.error(error)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["following"], exact: false })
            queryClient.invalidateQueries({ queryKey: ["searchUsers"], exact: false })
            queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
            queryClient.invalidateQueries({ queryKey: ["followers"], exact: false })
            queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
            queryClient.invalidateQueries({
                queryKey: ["profile", username],
                refetchType: "none",
            })
            queryClient.invalidateQueries({ queryKey: ["recentSearchers"] })
        },
    })

    const handleStorySubmit = async (storyData) => {
        console.log("Story submitted:", storyData)
        // TODO: Implement story submission API call
        // For now, just log the data
        // You can implement the actual API call here when the backend is ready
    }

    useEffect(() => {
        const embeddedStory = userProfileInfo?.latestStory
        const cachedStory = profileInfo?.latestStory

        if (!embeddedStory || !cachedStory) return

        if (embeddedStory.createdAt > cachedStory.createdAt)
            queryClient.invalidateQueries({ queryKey: ["profile", username] })
    }, [userProfileInfo, profileInfo])

    useEffect(() => {
        const resetState = () => {
            return navigate(`/profile/${username}`, { replace: true }, { state: null })
        }

        window.addEventListener("beforeunload", resetState)

        return () => window.removeEventListener("beforeunload", resetState)
    }, [navigate, username])

    // useEffect(() => {
    //     const handleResize = () => setIsMobile(window.innerWidth <= 768)
    //     window.addEventListener("resize", handleResize)
    //     return () => window.removeEventListener("resize", handleResize)
    // }, [])

    // Render loading, error, or main content
    if (isFetching) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                }}
            >
                <Spinner
                    withStyles={false}
                    size={30}
                />
            </div>
        )
    }
    if (error) {
        return (
            <div style={styles.errorContainer}>
                <div style={styles.errorContent}>
                    <div style={styles.errorIconContainer}>
                        <svg
                            width='48'
                            height='48'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='#ff6b6b'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <circle
                                cx='12'
                                cy='12'
                                r='10'
                            />
                            <line
                                x1='12'
                                y1='8'
                                x2='12'
                                y2='12'
                            />
                            <line
                                x1='12'
                                y1='16'
                                x2='12.01'
                                y2='16'
                            />
                        </svg>
                    </div>
                    <h3 style={styles.errorTitle}>Could not fetch profile</h3>
                    <p style={styles.errorMessage}>
                        {error.response?.status === 404
                            ? "This user profile could not be found."
                            : "There was an error loading this profile."}
                    </p>
                </div>
            </div>
        )
    }

    const isOwnProfile = profileInfo?._id === userData?._id
    const bioTrimmed = profileInfo?.bio ? profileInfo.bio.trim() : ""

    return (
        <div className='page-wrapper profile-page'>
            <div style={{ ...styles.profileContainer, ...(isMobile && { padding: "0 8px", width: "100%" }) }}>
                {profileInfo && (
                    <div style={styles.profileContent}>
                        {isMobile ? (
                            // Mobile Layout: username above profile pic, bio below, then actions
                            <>
                                <div style={{ display: "flex" }}>
                                    <ProfilePic
                                        isOwn={isOwnProfile}
                                        size={77}
                                        hasStory={true}
                                        userData={profileInfo}
                                        story={profileInfo.latestStory}
                                        showCreateStoryIcon={isOwnProfile}
                                        onStorySubmit={handleStorySubmit}
                                        src={
                                            profileInfo.profilePic &&
                                            `${BASE_URL}/uploads/profilePics/${profileInfo.profilePic}`
                                        }
                                    />
                                </div>

                                <div
                                    style={{
                                        marginLeft: 8,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <h1 style={styles.mobileUsername}>{profileInfo?.username}</h1>
                                    {!isOwnProfile && (
                                        <button
                                            onClick={() => setShowOptionsModal(true)}
                                            style={styles.optionsButton}
                                            aria-label='Options'
                                            title='Options'
                                        >
                                            <BsThreeDots
                                                size={18}
                                                color='#fff'
                                            />
                                        </button>
                                    )}
                                </div>

                                {/* Mobile Bio */}
                                <div
                                    style={{
                                        marginBottom: 5,
                                        marginLeft: 8,
                                        marginTop: isOwnProfile && 5,
                                    }}
                                >
                                    {bioTrimmed ? (
                                        <div style={styles.mobileBioText}>{bioTrimmed}</div>
                                    ) : (
                                        !isOwnProfile && (
                                            <div
                                                style={{
                                                    ...styles.mobileBioText,
                                                    ...styles.noBioText,
                                                }}
                                            >
                                                No bio yet
                                            </div>
                                        )
                                    )}

                                    {/* If viewing someone else's profile, show journeys badge here (below username or below bio). Use a smaller mobile badge for non-owned profiles. */}
                                    {!isOwnProfile && (
                                        <div>
                                            <div style={styles.completedJourneysBadgeMobile}>
                                                <span style={styles.badgeIcon}>🏆</span>
                                                <span style={styles.badgeTextMobile}>
                                                    {profileInfo.completedJourneys || 0} completed{" "}
                                                    {profileInfo.completedJourneys === 1
                                                        ? "journey"
                                                        : "journeys"}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mobile Actions */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        marginBottom: 12,
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                    }}
                                >
                                    {isOwnProfile ? (
                                        <>
                                            <SubmitButton
                                                onClick={() => setIsCreateModalOpen(true)}
                                                style={{
                                                    flex: "1 1 120px",
                                                    width: "auto",
                                                    minWidth: 0,
                                                    padding: "6px 10px",
                                                    height: 32,
                                                    backgroundColor: "var(--darkGrey)",

                                                    color: "#fff",
                                                }}
                                            >
                                                Create Journey
                                            </SubmitButton>

                                            <SettingsModal
                                                trigger={
                                                    <SubmitButton
                                                        style={{
                                                            flex: "1 1 120px",
                                                            width: "auto",
                                                            minWidth: 0,
                                                            padding: "6px 10px",
                                                            height: 32,
                                                            backgroundColor: "var(--darkGrey)",
                                                            color: "#fff",
                                                        }}
                                                    >
                                                        Edit profile
                                                    </SubmitButton>
                                                }
                                            />

                                            <div style={styles.completedJourneysBadge}>
                                                <span style={styles.badgeIcon}>🏆</span>
                                                <span style={styles.badgeText}>
                                                    {profileInfo.completedJourneys || 0}
                                                </span>
                                            </div>
                                        </>
                                    ) : profileInfo.isBlocked ? (
                                        <SubmitButton
                                            onClick={(e) => {
                                                e.preventDefault()
                                                // Do nothing for blocked users
                                            }}
                                            disabled={true}
                                            style={{
                                                ...styles.mobileFollowButton,
                                                backgroundColor: "var(--darkGrey)",
                                                opacity: 0.6,
                                            }}
                                        >
                                            Unavailable
                                        </SubmitButton>
                                    ) : (
                                        <>
                                            <SubmitButton
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    if (!token) {
                                                        setShowLoginModal(true)
                                                        return
                                                    }
                                                    const type =
                                                        profileInfo.isFollowing ||
                                                        profileInfo.isRequested
                                                            ? "unfollow"
                                                            : "follow"
                                                    followMutation.mutate({
                                                        type,
                                                        userId: profileInfo._id,
                                                    })
                                                }}
                                                isDisabled={followMutation.isPending}
                                                style={{
                                                    ...styles.desktopFollowButton,
                                                    flex: "1 1 120px",
                                                    width: "auto",
                                                    minWidth: 0,
                                                    ...(profileInfo.isFollowing ||
                                                    profileInfo.isRequested
                                                        ? { backgroundColor: "var(--darkGrey)" }
                                                        : {
                                                              backgroundColor: "var(--primary)",
                                                          }),
                                                }}
                                            >
                                                {followMutation.isPending ? (
                                                    <Spinner
                                                        withStyles={false}
                                                        size={13}
                                                        noDelay={true}
                                                    />
                                                ) : profileInfo.isFollowing ? (
                                                    "Following"
                                                ) : profileInfo.isRequested ? (
                                                    "Requested"
                                                ) : (
                                                    "Follow"
                                                )}
                                            </SubmitButton>

                                            <SubmitButton
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    if (!token) {
                                                        setShowLoginModal(true)
                                                        return
                                                    }
                                                    navigate("/chats", {
                                                        state: { targetUserInfo: profileInfo },
                                                    })
                                                }}
                                                style={{
                                                    ...styles.desktopFollowButton,
                                                    flex: "1 1 120px",
                                                    width: "auto",
                                                    minWidth: 0,
                                                }}
                                            >
                                                Message
                                            </SubmitButton>
                                            {/* <SubmitButton
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    if (!token) {
                                                        setShowLoginModal(true)
                                                        return
                                                    }
                                                    const type =
                                                        profileInfo.isFollowing ||
                                                        profileInfo.isRequested
                                                            ? "unfollow"
                                                            : "follow"
                                                    followMutation.mutate({
                                                        type,
                                                        userId: profileInfo._id,
                                                    })
                                                }}
                                                disabled={followMutation.isPending}
                                                style={{ minWidth: 110 }}
                                            >
                                                {followMutation.isPending ? (
                                                    <Spinner
                                                        withStyles={false}
                                                        size={13}
                                                        noDelay={true}
                                                    />
                                                ) : profileInfo.isFollowing ? (
                                                    "Following"
                                                ) : profileInfo.isRequested ? (
                                                    "Requested"
                                                ) : (
                                                    "Follow"
                                                )}
                                            </SubmitButton>

                                            <SubmitButton
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    if (!token) {
                                                        setShowLoginModal(true)
                                                        return
                                                    }
                                                    navigate("/chats", {
                                                        state: { targetUserInfo: profileInfo },
                                                    })
                                                }}
                                                style={{ minWidth: 110 }}
                                            >
                                                Message
                                            </SubmitButton> */}
                                        </>
                                    )}
                                </div>

                                {/* Mobile Stats */}
                                <div style={styles.mobileStats}>
                                    <FollowListModal profileInfo={profileInfo} />
                                </div>

                                {/* Mobile HR Separator */}
                                <hr style={styles.mobileSeparator} />
                            </>
                        ) : (
                            // Desktop Layout
                            <div style={styles.desktopHeader}>
                                <div style={styles.desktopProfilePic}>
                                    <ProfilePic
                                        size={150}
                                        isOwn={isOwnProfile}
                                        userData={profileInfo}
                                        story={profileInfo.latestStory}
                                        showCreateStoryIcon={isOwnProfile}
                                        onStorySubmit={handleStorySubmit}
                                        src={
                                            profileInfo.profilePic &&
                                            `${BASE_URL}/uploads/profilePics/${profileInfo.profilePic}`
                                        }
                                    />
                                </div>
                                <div style={styles.desktopInfo}>
                                    <div style={styles.desktopUsernameRow}>
                                        <h1 style={styles.desktopUsername}>
                                            {profileInfo?.username}
                                        </h1>
                                        {!isOwnProfile && (
                                            <button
                                                onClick={() => setShowOptionsModal(true)}
                                                style={styles.optionsButton}
                                            >
                                                <BsThreeDots
                                                    size={20}
                                                    color='#fff'
                                                />
                                            </button>
                                        )}
                                        {isOwnProfile ? (
                                            <>
                                                <SettingsModal
                                                    trigger={
                                                        <SubmitButton
                                                            style={{
                                                                width: 170,
                                                                height: 32,
                                                                fontSize: 14,
                                                                marginTop: 10,
                                                                backgroundColor: "var(--darkGrey)",
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            Edit profile
                                                        </SubmitButton>
                                                    }
                                                />
                                            </>
                                        ) : profileInfo.isBlocked ? (
                                            <SubmitButton
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    // Do nothing for blocked users
                                                }}
                                                isDisabled={true}
                                                style={{
                                                    ...styles.desktopFollowButton,
                                                    backgroundColor: "var(--darkGrey)",
                                                    opacity: 0.6,
                                                }}
                                            >
                                                Unavailable
                                            </SubmitButton>
                                        ) : (
                                            <>
                                                <SubmitButton
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        if (!token) {
                                                            setShowLoginModal(true)
                                                            return
                                                        }
                                                        const type =
                                                            profileInfo.isFollowing ||
                                                            profileInfo.isRequested
                                                                ? "unfollow"
                                                                : "follow"
                                                        followMutation.mutate({
                                                            type,
                                                            userId: profileInfo._id,
                                                        })
                                                    }}
                                                    isDisabled={followMutation.isPending}
                                                    style={{
                                                        ...styles.desktopFollowButton,
                                                        ...(profileInfo.isFollowing ||
                                                        profileInfo.isRequested
                                                            ? { backgroundColor: "var(--darkGrey)" }
                                                            : {
                                                                  backgroundColor: "var(--primary)",
                                                              }),
                                                    }}
                                                >
                                                    {followMutation.isPending ? (
                                                        <Spinner
                                                            withStyles={false}
                                                            size={13}
                                                            noDelay={true}
                                                        />
                                                    ) : profileInfo.isFollowing ? (
                                                        "Following"
                                                    ) : profileInfo.isRequested ? (
                                                        "Requested"
                                                    ) : (
                                                        "Follow"
                                                    )}
                                                </SubmitButton>

                                                <SubmitButton
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        if (!token) {
                                                            setShowLoginModal(true)
                                                            return
                                                        }
                                                        navigate("/chats", {
                                                            state: { targetUserInfo: profileInfo },
                                                        })
                                                    }}
                                                    style={{
                                                        ...styles.desktopFollowButton,
                                                    }}
                                                >
                                                    Message
                                                </SubmitButton>
                                            </>
                                        )}
                                    </div>

                                    <div style={styles.desktopStats}>
                                        {!profileInfo.isBlocked ? (
                                            <FollowListModal profileInfo={profileInfo} />
                                        ) : (
                                            <div style={styles.blockedStats}>
                                                <span style={styles.statItem}>
                                                    <span style={styles.statNumber}>-</span>
                                                    <span style={styles.statLabel}>followers</span>
                                                </span>
                                                <span style={styles.statItem}>
                                                    <span style={styles.statNumber}>-</span>
                                                    <span style={styles.statLabel}>following</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={styles.desktopBio}>
                                        {bioTrimmed ? (
                                            <div style={styles.desktopBioText}>{bioTrimmed}</div>
                                        ) : !isOwnProfile ? (
                                            <div
                                                style={{
                                                    ...styles.desktopBioText,
                                                    ...styles.noBioText,
                                                }}
                                            >
                                                No bio yet
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Desktop Journey Badge */}
                                    <div style={styles.desktopJourneyBadge}>
                                        <span style={styles.desktopBadgeIcon}>🏆</span>
                                        <span style={styles.desktopBadgeText}>
                                            {profileInfo.completedJourneys || 0} completed journeys
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Journeys Section */}
                        <div style={styles.journeysSection}>
                            {/* Add to journey control (above the journeys list) */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    marginBottom: 12,
                                }}
                            >
                                {isOwnProfile && !isMobile && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            background: "#ff4444",
                                            color: "#fff",
                                            border: "none",
                                            cursor: "pointer",
                                            fontWeight: 700,
                                        }}
                                    >
                                        <svg
                                            width='16'
                                            height='16'
                                            viewBox='0 0 24 24'
                                            fill='none'
                                        >
                                            <path
                                                d='M12 5v14M5 12h14'
                                                stroke='#fff'
                                                strokeWidth='2'
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                            />
                                        </svg>
                                        Add to journey
                                    </button>
                                )}
                            </div>
                            <div style={styles.journeysTabContainer}>
                                <div style={styles.journeysTab}>
                                    <svg
                                        width='20'
                                        height='20'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        stroke='currentColor'
                                        strokeWidth='2'
                                    >
                                        <rect
                                            x='3'
                                            y='3'
                                            width='18'
                                            height='18'
                                            rx='2'
                                            ry='2'
                                        ></rect>
                                        <rect
                                            x='7'
                                            y='7'
                                            width='3'
                                            height='3'
                                        ></rect>
                                        <rect
                                            x='14'
                                            y='7'
                                            width='3'
                                            height='3'
                                        ></rect>
                                        <rect
                                            x='7'
                                            y='14'
                                            width='10'
                                            height='3'
                                        ></rect>
                                    </svg>
                                    <span style={styles.journeysTabText}>JOURNEYS</span>
                                </div>
                            </div>

                            <div style={styles.journeysContainer}>
                                <JourneyGallery profileInfo={profileInfo} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <CreateJourneyModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    userId={userData?._id}
                />
                <UnauthorizedLoginPopupModal
                    isOpen={showLoginModal}
                    onClose={() => setShowLoginModal(false)}
                    title='Login Required'
                    message='Please login to follow users.'
                />

                {/* Options Modal */}
                <Modal
                    isOpen={showOptionsModal}
                    onClose={() => setShowOptionsModal(false)}
                    style={styles.optionsModal}
                >
                    <div style={styles.optionsModalContent}>
                        <button
                            disabled={blockMutation.isPending}
                            onClick={() => {
                                blockMutation.mutate({
                                    targetUserId: profileInfo._id,
                                    targetUserInfo: profileInfo,
                                })
                                setShowOptionsModal(false)
                            }}
                            style={styles.blockButton}
                        >
                            Block User
                        </button>

                        {blockMutation.error && (
                            <div
                                style={{
                                    color: "red",
                                    padding: "13px 0",
                                    fontSize: 13,
                                    marginTop: 10,
                                }}
                            >
                                Error blocking user
                            </div>
                        )}
                    </div>
                </Modal>
            </div>
        </div>
    )
}

const FollowListModal = ({ profileInfo }) => {
    const [openModalType, setOpenModalType] = useState("")
    const [selectedUser, setSelectedUser] = useState(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const navigate = useNavigate()
    const { fetchFollowList } = useUsers()
    const userId = useSelector((state) => state.auth.userData?._id)
    const isMobile = useMediaQuery({ maxWidth: SMALL_SCREEN_SIZE })
    const isOwn = userId === profileInfo._id
    const queryEnabled = profileInfo?.isFollowing || profileInfo?.privacyStatus === false || isOwn
    const queryClient = useQueryClient()

    const removeFollowerMutation = useMutation({
        mutationFn: (followerId) => axios.delete(`/api/users/remove-follower/${followerId}`),
        onSuccess: () => {
            queryClient.invalidateQueries([profileInfo._id, openModalType])
            setShowConfirmDialog(false)
            setSelectedUser(null)
        },
    })

    const unfollowMutation = useMutation({
        mutationFn: (targetUserId) =>
            axios.put(`/api/users/follow/${targetUserId}`, { type: "unfollow" }),
        onSuccess: () => {
            queryClient.invalidateQueries([profileInfo._id, openModalType])
            setShowConfirmDialog(false)
            setSelectedUser(null)
        },
    })

    const handleUnfollow = (targetUserId) => {
        unfollowMutation.mutate(targetUserId)
    }

    const { data, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: [profileInfo._id, openModalType],
        queryFn: fetchFollowList,
        initialPageParam: undefined,
        enabled: !!openModalType && queryEnabled,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    })

    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0,
        rootMargin: "100px",
    })

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

    const updateOpenModal = (value) => {
        if (!queryEnabled) return
        setOpenModalType(value)
    }

    const handleUserClick = (user) => {
        setOpenModalType("")
        navigate(`/profile/${user.username}`, { replace: true })
    }

    const users = data?.pages?.flatMap((page) => page[openModalType]) || []

    return (
        <div style={isMobile ? styles.mobileStatsContainer : styles.desktopStatsContainer}>
            <button
                style={isMobile ? styles.mobileStatButton : styles.desktopStatButton}
                onClick={() => updateOpenModal("followers")}
                disabled={!queryEnabled}
            >
                <span style={styles.statNumber}>{profileInfo.followers || 0}</span>
                <span style={styles.statLabel}>
                    {profileInfo.followers === 1 ? "follower" : "followers"}
                </span>
            </button>

            <button
                style={isMobile ? styles.mobileStatButton : styles.desktopStatButton}
                onClick={() => updateOpenModal("following")}
                disabled={!queryEnabled}
            >
                <span style={styles.statNumber}>{profileInfo.following || 0}</span>
                <span style={styles.statLabel}>following</span>
            </button>

            <Modal
                isOpen={!!openModalType}
                onClose={() => setOpenModalType("")}
                style={isMobile ? styles.followModalMobile : styles.followModal}
            >
                <div style={styles.followModalContent}>
                    <div style={styles.followModalHeader}>
                        <h3 style={styles.followModalTitle}>
                            {openModalType === "followers" ? "Followers" : "Following"}
                        </h3>
                        <button
                            onClick={() => setOpenModalType("")}
                            style={styles.followModalCloseButton}
                        >
                            ×
                        </button>
                    </div>

                    <div style={styles.followModalBody}>
                        {isFetching && users.length === 0 ? (
                            <div style={styles.skeletonContainer}>
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <UserSkeleton key={index} />
                                ))}
                            </div>
                        ) : users.length > 0 ? (
                            <>
                                <UserList
                                    users={users}
                                    handleClick={handleUserClick}
                                    isOwn={isOwn}
                                    type={openModalType}
                                    profileId={profileInfo._id}
                                />
                                {showConfirmDialog && (
                                    <Modal
                                        isOpen={showConfirmDialog}
                                        onClose={() => {
                                            setShowConfirmDialog(false)
                                            setSelectedUser(null)
                                        }}
                                        style={styles.confirmModal}
                                    >
                                        <div style={styles.confirmContent}>
                                            <h4 style={styles.confirmTitle}>
                                                Are you sure you want to remove this{" "}
                                                {openModalType === "followers"
                                                    ? "follower"
                                                    : "following"}
                                                ?
                                            </h4>
                                            <div style={styles.confirmButtons}>
                                                <button
                                                    onClick={() => {
                                                        if (openModalType === "followers") {
                                                            removeFollowerMutation.mutate(
                                                                selectedUser._id,
                                                            )
                                                        } else {
                                                            handleUnfollow(selectedUser._id)
                                                        }
                                                    }}
                                                    style={styles.confirmButton}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowConfirmDialog(false)
                                                        setSelectedUser(null)
                                                    }}
                                                    style={styles.cancelButton}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                    </Modal>
                                )}
                                {hasNextPage && (
                                    <div
                                        ref={loadMoreRef}
                                        style={styles.loadMoreTrigger}
                                    >
                                        {isFetchingNextPage && (
                                            <Spinner
                                                withStyles={false}
                                                size={20}
                                            />
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={styles.emptyState}>
                                <p style={styles.emptyText}>
                                    {openModalType === "followers"
                                        ? "No followers yet"
                                        : "Not following anyone yet"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    )
}

const styles = {
    container: {
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        padding: "20px 0",
    },
    userActions: {
        position: "relative",
        marginLeft: "auto",
    },
    actionButton: {
        background: "none",
        border: "none",
        color: "#fff",
        fontSize: "20px",
        cursor: "pointer",
        padding: "0 10px",
    },
    confirmModal: {
        content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#1a1a1a",
            borderRadius: "10px",
            padding: "20px",
            width: "90%",
            maxWidth: "400px",
        },
    },
    confirmContent: {
        color: "#fff",
        textAlign: "center",
    },
    confirmTitle: {
        marginBottom: "20px",
        fontSize: "18px",
    },
    confirmButtons: {
        display: "flex",
        justifyContent: "center",
        gap: "10px",
    },
    confirmButton: {
        backgroundColor: "#ff4444",
        color: "#fff",
        border: "none",
        padding: "8px 20px",
        borderRadius: "5px",
        cursor: "pointer",
    },
    cancelButton: {
        backgroundColor: "#333",
        color: "#fff",
        border: "none",
        padding: "8px 20px",
        borderRadius: "5px",
        cursor: "pointer",
    },
    profileContainer: {
        maxWidth: 800,
        margin: "0 auto",
        padding: "0 30px",
    },
    profileContent: {
        display: "flex",
        flexDirection: "column",
    },
    // Mobile Styles
    mobileHeader: {
        display: "flex",
        alignItems: "center",
        padding: "16px",
        gap: 16,
    },
    mobileProfilePic: {
        flexShrink: 0,
    },
    mobileHeaderInfo: {
        flex: 1,
        display: "flex",

        flexDirection: "column",
        gap: 8,
    },
    mobileUsernameRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    mobileUsername: {
        fontSize: "20px",
        fontWeight: 600,
        margin: 0,
        color: "#fff",
        overflowWrap: "anywhere",
    },
    mobileActionButtons: {
        display: "flex",
        gap: 8,
    },
    mobileIconButton: {
        padding: "8px",
        borderRadius: 6,
        border: "1px solid #333",
        cursor: "pointer",
        backgroundColor: "transparent",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
    },
    mobileFollowButton: {
        padding: "6px 16px",
        borderRadius: 6,
        border: "none",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        backgroundColor: "#0095f6",
        color: "#fff",
    },
    mobileBio: {
        marginLeft: 110,
        paddingRight: 16,
    },
    mobileJourneyActions: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
    },
    mobileCreateJourneyButton: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        backgroundColor: "#0095f6",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
    },
    completedJourneysBadge: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "8px 12px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 12,
        fontSize: "12px",
        minHeight: "24px",
    },
    completedJourneysBadgeMobile: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 10,
        fontSize: "11px",
        minHeight: 18,
        color: "#fff",
        marginBottom: 15,
    },
    badgeTextMobile: {
        color: "#fff",
        fontSize: 11,
        lineHeight: 1,
        fontWeight: 700,
    },
    badgeIcon: {
        fontSize: "14px",
        width: "14px",
        height: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
    },
    badgeText: {
        color: "#fff",
        fontWeight: 700,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
    },
    mobileDisplayName: {
        fontSize: "14px",
        fontWeight: 600,
        margin: "0 0 4px 0",
        color: "#fff",
    },
    mobileBioText: {
        fontSize: "14px",
        lineHeight: 1.4,
        color: "#fff",
        marginBottom: 10,
        overflowWrap: "anywhere",
    },
    noBioText: {
        fontStyle: "italic",
    },
    mobileStats: {
        borderTop: "1px solid #262626",
        padding: "12px 0",
    },
    mobileSeparator: {
        border: "none",
        borderTop: "1px solid #262626",
        margin: "0",
    },

    // Desktop Styles
    desktopHeader: {
        display: "flex",
        alignItems: "flex-start",
        padding: "32px 0",
        gap: 32,
    },
    desktopProfilePic: {
        flexShrink: 0,
    },
    desktopInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 20,
    },
    desktopUsernameRow: {
        display: "flex",
        alignItems: "center",
        gap: 20,
    },
    desktopIconButton: {
        padding: "8px",
        borderRadius: 8,
        border: "1px solid #333",
        cursor: "pointer",
        backgroundColor: "transparent",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
    },
    desktopUsername: {
        fontSize: "22px",
        fontWeight: 400,
        marginTop: 20,
        color: "#fff",
    },
    desktopFollowButton: {
        padding: "6px",
        borderRadius: 8,
        marginTop: 5,
        border: "none",
        fontSize: 14,
        width: 170,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 35,
        fontWeight: 600,
        cursor: "pointer",
        backgroundColor: "#0095f6",
        color: "#fff",
    },
    desktopStats: {
        display: "flex",
        gap: 40,
    },
    desktopBio: {
        marginTop: 4,
    },
    desktopJourneyBadge: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "6px 12px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 16,
        fontSize: "14px",
        width: "fit-content",
        minHeight: "32px",
    },
    desktopBadgeIcon: {
        fontSize: "16px",
        width: "16px",
        height: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
    },
    desktopBadgeText: {
        color: "#fff",
        fontWeight: 500,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
    },
    desktopDisplayName: {
        fontSize: "16px",
        fontWeight: 600,
        margin: "0 0 4px 0",
        color: "#fff",
    },
    desktopBioText: {
        fontSize: "16px",
        lineHeight: 1.5,
        color: "#fff",
        margin: 0,
    },

    desktopStatsContainer: {
        display: "flex",
        gap: 40,
    },
    mobileStatsContainer: {
        display: "flex",
        justifyContent: "space-around",
        padding: "0 16px",
    },
    desktopStatButton: {
        background: "none",
        border: "none",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: 0,
        fontSize: "16px",
        transition: "opacity 0.2s",
    },
    mobileStatButton: {
        background: "none",
        border: "none",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "8px",
        fontSize: "14px",
        transition: "opacity 0.2s",
    },
    statNumber: {
        fontWeight: 600,
        color: "#fff",
    },
    statLabel: {
        color: "#aaa",
        fontWeight: 400,
    },

    journeysSection: {
        padding: "0 0 0 0",
    },
    journeysTabContainer: {
        display: "flex",
        justifyContent: "center",
        borderBottom: "1px solid var(--border)",
        marginBottom: 16,
    },
    journeysTab: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 8px 12px 0",
        borderBottom: "1px solid var(--primary)",
        marginBottom: -1,
        color: "var(--text)",
    },
    journeysTabText: {
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "1px",
    },
    journeysTitle: {
        fontSize: "1.5rem",
        fontWeight: 500,
        margin: "0 0 24px 0",
        color: "#fff",
        textAlign: "center",
    },
    journeysContainer: {
        width: "100%",
    },
    // Follow Modal styles
    followModal: {
        backgroundColor: "#1a1a1a",
        borderRadius: 12,
        width: 400,
        height: 500,
        border: "1px solid #333",
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
    },
    followModalMobile: {
        backgroundColor: "#1a1a1a",
        borderRadius: 12,
        width: "90%",
        height: "70%",
        border: "1px solid #333",
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
    },
    followModalContent: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
    },
    followModalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid #333",
        flexShrink: 0,
    },
    followModalTitle: {
        fontSize: "1.1rem",
        fontWeight: 600,
        margin: 0,
        color: "#fff",
    },
    followModalCloseButton: {
        background: "none",
        border: "none",
        color: "#aaa",
        fontSize: 20,
        cursor: "pointer",
        padding: 4,
        lineHeight: 1,
    },
    followModalBody: {
        flex: 1,
        padding: "16px 20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
    },
    loadingContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    loadMoreTrigger: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px 0",
        minHeight: 60,
    },
    skeletonContainer: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    userSkeleton: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
    },
    skeletonAvatar: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        backgroundColor: "#333",
        animation: "pulse 1.5s ease-in-out infinite",
    },
    skeletonContent: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    skeletonLine: {
        height: 14,
        backgroundColor: "#333",
        borderRadius: 4,
        width: "60%",
        animation: "pulse 1.5s ease-in-out infinite",
    },
    skeletonLineSmall: {
        height: 12,
        backgroundColor: "#333",
        borderRadius: 4,
        width: "40%",
        animation: "pulse 1.5s ease-in-out infinite",
    },
    emptyState: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyText: {
        color: "#aaa",
        fontSize: 16,
        margin: 0,
    },
    optionsButton: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        marginTop: 15,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "#333",
        },
    },
    optionsModal: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        height: 70,
    },
    optionsModalContent: {
        backgroundColor: "#1a1a1a",
        borderRadius: 12,
        padding: "20px",
        minWidth: "100px",
        maxWidth: "90vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    blockButton: {
        background: "none",
        border: "none",
        color: "#ff4444",
        fontSize: "16px",
        fontWeight: 500,
        cursor: "pointer",
        borderRadius: 8,
        transition: "background-color 0.2s",
        width: "100%",
        textAlign: "center",
        "&:hover": {
            backgroundColor: "#2a1a1a",
        },
    },
    blockedStats: {
        display: "flex",
        gap: 20,
        marginTop: 16,
    },
    statItem: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "default",
    },
    statNumber: {
        fontSize: "18px",
        fontWeight: "600",
        color: "#fff",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: "14px",
        color: "#aaa",
        textTransform: "lowercase",
    },
    errorContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: "20px",
    },
    errorContent: {
        backgroundColor: "#1a1a1a",
        borderRadius: "16px",
        border: "1px solid #333",
        padding: "40px 30px",
        textAlign: "center",
        maxWidth: "400px",
        width: "100%",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    },
    errorIconContainer: {
        display: "flex",
        justifyContent: "center",
        marginBottom: "20px",
        padding: "16px",
        backgroundColor: "rgba(255, 107, 107, 0.1)",
        borderRadius: "50%",
        width: "80px",
        height: "80px",
        margin: "0 auto 20px auto",
        alignItems: "center",
    },
    errorTitle: {
        color: "#fff",
        fontSize: "20px",
        fontWeight: "600",
        margin: "0 0 12px 0",
        letterSpacing: "-0.01em",
    },
    errorMessage: {
        color: "#aaa",
        fontSize: "14px",
        lineHeight: "1.5",
        margin: "0 0 24px 0",
    },
}

// Add CSS animation for skeleton loading
const styleSheet = document.createElement("style")
styleSheet.type = "text/css"
styleSheet.innerText = `
@keyframes pulse {
    0% {
        opacity: 1;
    }
    50% {
        opacity: 0.4;
    }
    100% {
        opacity: 1;
    }
}

.retry-button {
    background-color: #ff6b6b;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.retry-button:hover {
    background-color: #ff5252;
    transform: translateY(-1px);
}

.retry-button:active {
    transform: translateY(0);
}
`
document.head.appendChild(styleSheet)

export default ProfilePage
