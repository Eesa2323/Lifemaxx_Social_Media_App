import useAxiosPrivate from "./useAxiosPrivate"
import { BASE_URL } from "../utils/config"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const useStories = () => {
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()

    // Create a new story
    const createStory = async (storyData) => {
        const formData = new FormData()

        // Add text content if exists
        if (storyData.content) {
            formData.append("content", storyData.content)
        }

        console.log("FILEO: " + storyData.file)

        // Add media file if exists
        if (storyData.file) {
            formData.append("media", storyData.file)
        }

        // Add textBoxes as JSON string
        if (storyData.textBoxes && storyData.textBoxes.length > 0) {
            formData.append("textBoxes", JSON.stringify(storyData.textBoxes))
        }

        // Add drawings as JSON string
        if (storyData.drawings && storyData.drawings.length > 0) {
            formData.append("drawings", JSON.stringify(storyData.drawings))
        }

        // Add crop data as JSON string
        if (storyData.cropData) {
            formData.append("cropData", JSON.stringify(storyData.cropData))
        }

        const response = await axiosPrivate.post(`${BASE_URL}/api/stories/`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        })
        return response.data
    }

    const createStoryMutation = useMutation({
        mutationFn: createStory,
        onSuccess: (data) => {
            // Invalidate and refetch user stories
            queryClient.invalidateQueries({ queryKey: ["stories"] })
            console.log("Story created successfully:", data)
        },
        onError: (error) => {
            console.error("Error creating story:", error)
        },
    })

    // Fetch stories for a specific user
    const fetchUserStories = async (userId) => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/stories/user/${userId}`)
        return response.data
    }

    const useUserStoriesQuery = (userId, enabled = true) => {
        return useQuery({
            queryKey: ["stories", "user", userId],
            queryFn: () => fetchUserStories(userId),
            // enabled: enabled && !!userId,
            enabled: enabled && !!userId,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
        })
    }

    // Fetch stories from followed users (for stories feed)
    const fetchFollowingStories = async () => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/stories/feed`)
        return response.data
    }

    const useFollowingStoriesQuery = (enabled = true) => {
        return useQuery({
            queryKey: ["stories", "following"],
            queryFn: fetchFollowingStories,
            enabled,
            staleTime: 2 * 60 * 1000, // 2 minutes
            gcTime: 5 * 60 * 1000, // 5 minutes
        })
    }

    // Mark story as viewed
    const markStoryAsViewed = async (data) => {
        const { _id } = data
        const response = await axiosPrivate.post(`${BASE_URL}/api/stories/${_id}/view`)
        return response.data
    }

    const markStoryAsViewedMutation = useMutation({
        mutationFn: ({ _id, userId }) => markStoryAsViewed({ _id, userId }),
        onMutate: (vars) => {
            const { _id, userId } = vars

            console.log("Mark _id: " + _id)
            console.log("Mark userId: " + userId)

            queryClient.setQueryData(["stories", "user", userId], (oldData) =>
                oldData.map((story) => (story._id === _id ? { ...story, viewed: true } : story))
            )
        },
    })

    // Fetch story views
    const fetchStoryViews = async (storyId) => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/stories/views/${storyId}`)
        return response.data
    }

    const useStoryViewsQuery = (storyId, enabled = true) => {
        return useQuery({
            queryKey: ["story", "views", storyId],
            queryFn: () => fetchStoryViews(storyId),
            enabled: enabled && !!storyId,
            staleTime: 30 * 1000, // 30 seconds
            gcTime: 2 * 60 * 1000, // 2 minutes
        })
    }

    // Delete story
    const deleteStory = async (storyId) => {
        const response = await axiosPrivate.delete(`${BASE_URL}/api/stories/${storyId}`)
        return response.data
    }

    const deleteStoryMutation = useMutation({
        mutationFn: deleteStory,
        onSuccess: (data) => {
            // Invalidate and refetch user stories
            queryClient.invalidateQueries({ queryKey: ["stories"] })
            console.log("Story deleted successfully:", data)
        },
        onError: (error) => {
            console.error("Error deleting story:", error)
        },
    })

    return {
        createStoryMutation,
        useUserStoriesQuery,
        useFollowingStoriesQuery,
        fetchUserStories,
        markStoryAsViewedMutation,
        useStoryViewsQuery,
        fetchStoryViews,
        deleteStoryMutation,
    }
}

export default useStories
