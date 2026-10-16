import { useContext, useRef, useState, useEffect } from "react"
import default_profile_pic2 from "../assets/imgs/default_profile_pic2.jpg"
import StoryModal from "./StoryModal"
import { FiPlus } from "react-icons/fi"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSelector } from "react-redux"
import useStories from "../hooks/useStories"
import { usePostsContext } from "../contexts/PostContext"
import useUsers from "../hooks/useUsers"
import { useNavigate } from "react-router-dom"

function getLatestStoryBasedOnDate(stories) {
    return stories.sort((a, b) => new Date(b?.createdAt) - new Date(a?.createdAt))?.[0] || null
}

const ProfilePic = ({
    size,
    onChange,
    src,
    style,
    latestStory,
    hasEdit,
    editText = "Edit",
    hasStory = false,
    showCreateStoryIcon = false,
    showStoryIndicator = true,
    onStorySubmit,
    userData,

    isOwn,
}) => {
    const imgSize = size || 55
    const fileRef = useRef()
    const imgRef = useRef()
    const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
    const queryClient = useQueryClient()
    const userId = useSelector((state) => state.auth?.userData?._id)
    const { data: authenticatedUserStories } = useQuery({
        queryKey: ["stories", "user", userId],
        queryFn: () => fetchUserStories(userId),
        staleTime: Infinity,
        gcTime: Infinity,
        enabled: !!isOwn,
    })

    const navigate = useNavigate()

    const { getStoryViewedTimestamp } = usePostsContext()
    const { useProfileQuery } = useUsers()

    const { useUserStoriesQuery, markStoryAsViewedMutation, fetchUserStories } = useStories()
    const { data: stories = [], isLoading, error } = useUserStoriesQuery(userData?._id, false)
    const { data: profileInfo } = useProfileQuery(userData?.username, false)

    const cachedStory = isOwn ? authenticatedUserStories?.at(-1) : stories?.at(-1)
    const story = getLatestStoryBasedOnDate([latestStory, cachedStory, profileInfo?.latestStory])
    const storyViewedTimestamp = getStoryViewedTimestamp(userData?._id)
    const latestStorySeen = storyViewedTimestamp
        ? storyViewedTimestamp >= story?.createdAt
        : story?.viewed
    const indicatorCSSID =
        showStoryIndicator && latestStorySeen === true
            ? `inactiveStoryBorder`
            : showStoryIndicator && latestStorySeen === false && `activeStoryBorder`

    useEffect(() => {
        if (!latestStory?.createdAt || !cachedStory?.createdAt || isOwn) return

        if (latestStory.createdAt > cachedStory.createdAt) {
            queryClient.invalidateQueries({ queryKey: ["stories", "user", story?.user] })
        }
    }, [cachedStory?.createdAt, latestStory?.createdAt, queryClient, isOwn])

    const handleFileChange = () => {
        if (onChange && hasEdit) onChange(fileRef?.current?.files?.[0])
    }

    const handleStorySubmit = (storyData) => {
        if (onStorySubmit) {
            onStorySubmit(storyData)
        }
        setIsStoryModalOpen(false)
    }

    const handleOpenStory = async () => {
        if ((!cachedStory && !latestStory) || !userData?._id) return

        const story = cachedStory ?? latestStory
        const user = story.user?._id || story.user || userData?._id

        // console.log(story)
        await queryClient.fetchQuery({
            queryKey: ["stories", "user"],
            queryFn: () => fetchUserStories(user),
            enabled: true,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
        })

        return navigate(`/stories/${user}`, {
            state: { storyFeedIndex: null, latestStoryDate: latestStory?.createdAt },
        })
    }

    return (
        <div
            onClick={() => {
                if (!isStoryModalOpen) {
                    handleOpenStory()
                }
            }}
            style={{ position: "relative", display: "inline-block" }}
        >
            <div style={{ position: "relative", display: "inline-block" }}>
                <img
                    className={size < 100 ? "smallProfilePicStyle" : "largeProfilePicStyle"}
                    id={indicatorCSSID || undefined}
                    style={{
                        ...{
                            width: imgSize,
                            height: imgSize,
                            borderRadius: "50%",
                            objectFit: "cover",
                        },
                        ...style,
                    }}
                    ref={imgRef}
                    onError={() => (imgRef.current.src = default_profile_pic2)}
                    src={src || default_profile_pic2}
                />

                {/* Story Plus Button */}
                {(hasStory || showCreateStoryIcon) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsStoryModalOpen(true)
                        }}
                        style={{
                            position: "absolute",
                            bottom: "0px",
                            right: "0px",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "#0095f6",
                            border: "2px solid #fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "transform 0.2s",
                            zIndex: 2,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                        onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
                        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                    >
                        <FiPlus
                            style={{
                                color: "#fff",
                                fontSize: "14px",
                                strokeWidth: "3px",
                            }}
                        />
                    </button>
                )}
            </div>

            <div
                style={{
                    width: imgSize,
                    padding: 5,
                    height: "100%",
                    position: "relative",
                }}
            >
                {hasEdit === true && (
                    <label
                        style={{
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <input
                            onChange={handleFileChange}
                            ref={fileRef}
                            accept='image/png, image/jpeg, image/gif, image/jpg'
                            type='file'
                            hidden
                        />
                        <span
                            style={{
                                alignSelf: "center",
                                whiteSpace: "nowrap",
                                fontWeight: "bold",
                                fontSize: 12,
                                color: "var(--primary)",
                            }}
                        >
                            {editText}
                        </span>
                    </label>
                )}
            </div>

            {/* Story Modal */}
            {(hasStory || showCreateStoryIcon) && (
                <StoryModal
                    isOpen={isStoryModalOpen}
                    onClose={() => setIsStoryModalOpen(false)}
                    onSubmit={handleStorySubmit}
                />
            )}
        </div>
    )
}

export default ProfilePic
