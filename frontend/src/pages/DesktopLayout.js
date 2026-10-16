import React from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { BsThreeDots } from "react-icons/bs"
import { BASE_URL } from "../utils/config"

// Components
import ProfilePic from "../components/ProfilePic"
import SettingsModal from "../components/SettingsModal"
import SubmitButton from "../components/SubmitButton"
import Spinner from "../components/Spinner"
import FollowListModal from "./FollowListModal"

const DesktopLayout = ({
    profileInfo,
    currentUser,
    followMutation,
    handleStorySubmit,
    showOptionsModal,
    setShowOptionsModal,
    showLoginModal,
    setShowLoginModal,
    updateOpenModal,
}) => {
    const token = useSelector((state) => state.auth.token)
    const navigate = useNavigate()
    const isOwnProfile = profileInfo?._id === currentUser?._id

    return (
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
                    <h1 style={styles.desktopUsername}>{profileInfo?.username}</h1>
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
                        <SettingsModal />
                    ) : profileInfo.isBlocked ? (
                        <SubmitButton
                            onClick={(e) => e.preventDefault()}
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
                            <FollowButton
                                profileInfo={profileInfo}
                                token={token}
                                followMutation={followMutation}
                                setShowLoginModal={setShowLoginModal}
                                style={styles.desktopFollowButton}
                            />
                            <MessageButton
                                token={token}
                                profileInfo={profileInfo}
                                setShowLoginModal={setShowLoginModal}
                                navigate={navigate}
                                style={styles.desktopFollowButton}
                            />
                        </>
                    )}
                </div>

                <div style={styles.desktopStats}>
                    {!profileInfo.isBlocked ? (
                        <FollowListModal
                            profileInfo={profileInfo}
                            updateOpenModal={updateOpenModal}
                        />
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
                <div style={styles.desktopBio}>{profileInfo.bio}</div>

                {/* Desktop Journey Badge */}
                <div style={styles.desktopJourneyBadge}>
                    <span style={styles.desktopBadgeIcon}>🏆</span>
                    <span style={styles.desktopBadgeText}>
                        {profileInfo.completedJourneys || 0} completed journeys
                    </span>
                </div>
            </div>
        </div>
    )
}

// Helper components
const FollowButton = ({ profileInfo, token, followMutation, setShowLoginModal, style }) => (
    <SubmitButton
        onClick={(e) => {
            e.preventDefault()
            if (!token) {
                setShowLoginModal(true)
                return
            }
            const type = profileInfo.isFollowing || profileInfo.isRequested ? "unfollow" : "follow"
            followMutation.mutate({ type, userId: profileInfo._id })
        }}
        isDisabled={followMutation.isPending}
        style={{
            ...style,
            ...(profileInfo.isFollowing || profileInfo.isRequested
                ? { backgroundColor: "var(--darkGrey)" }
                : { backgroundColor: "var(--primary)" }),
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
)

const MessageButton = ({ token, profileInfo, setShowLoginModal, navigate, style }) => (
    <SubmitButton
        onClick={(e) => {
            e.preventDefault()
            if (!token) {
                setShowLoginModal(true)
                return
            }
            navigate("/chats", { state: { targetUserInfo: profileInfo } })
        }}
        style={style}
    >
        Message
    </SubmitButton>
)

export default DesktopLayout
