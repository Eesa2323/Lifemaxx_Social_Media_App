import { BASE_URL } from "../utils/config"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import useAxiosPrivate from "./useAxiosPrivate"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { updateUserData } from "../store/authSlice"
import axios from "../utils/axios"

const useUsers = () => {
    const token = useSelector((state) => state.auth.token)
    const axiosPrivate = useAxiosPrivate()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const searchUsers = async (queryTerm) => {
        const response = await axios.get(`${BASE_URL}/api/users/search/${queryTerm}`, {
            headers: { "x-auth-token": token },
        })
        return response.data
    }

    const fetchProfile = async (username) => {
        const response = await axios.get(`${BASE_URL}/api/users/accountinfo/${username}`, {
            headers: { "x-auth-token": token },
        })
        return response.data
    }

    const followUser = async (data) => {
        const { type, userId } = data

        const response = await axiosPrivate.put(`${BASE_URL}/api/users/follow/${userId}`, {
            type,
        })
        return response.data
    }

    const useProfileQuery = (username, enabled, initialData = null) => {
        return useQuery({
            queryKey: ["profile", username],
            queryFn: () => fetchProfile(username),
            staleTime: 3 * 60 * 1000,
            retry: false,
            ...(initialData && { initialData }),
            enabled,
        })
    }

    const updatedUserDetails = async (data) => {
        console.log(data)

        const { file, username, bio, interests, location } = data
        const formData = new FormData()

        username && formData.append("username", username)
        bio && formData.append("bio", bio)
        file && formData.append("file", file)
        interests && formData.append("interests", JSON.stringify(interests))
        location && formData.append("location", location)

        const response = await axiosPrivate.put(
            `${BASE_URL}/api/users/update_profile_details`,
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
            }
        )

        return response.data
    }

    const privacyChange = async (data) => {
        const { value } = data

        const response = await axiosPrivate.put(`${BASE_URL}/api/users/update_privacy_status`, {
            value,
        })
        return response.data
    }

    const getRecentSearchers = async () => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/users/recent-searchers`)
        return response.data
    }

    const addToRecentSearchers = async (targetUserId) => {
        const response = await axiosPrivate.post(`${BASE_URL}/api/users/recent-searchers`, {
            targetUserId,
        })
        return response.data
    }

    const removeFromRecentSearchers = async (targetUserId) => {
        const response = await axiosPrivate.delete(
            `${BASE_URL}/api/users/recent-searchers/${targetUserId}`
        )
        return response.data
    }

    const clearRecentSearchers = async () => {
        const response = await axiosPrivate.delete(`${BASE_URL}/api/users/recent-searchers`)
        return response.data
    }

    const fetchFollowList = async ({ queryKey, pageParam }) => {
        const [userId, type] = queryKey
        const endpoint = type === "followers" ? "followers" : "following"

        const params = new URLSearchParams()
        if (pageParam) params.append("cursor", pageParam)
        params.append("limit", "20")

        const response = await axiosPrivate.get(
            `${BASE_URL}/api/users/${endpoint}/${userId}?${params.toString()}`
        )
        return response.data
    }

    const blockUser = async (data) => {
        const { targetUserId } = data

        const response = await axiosPrivate.post(`${BASE_URL}/api/users/block/${targetUserId}`)
        return response.data
    }
    const unblockUser = async (data) => {
        const { uData } = data

        const response = await axiosPrivate.delete(`${BASE_URL}/api/users/unblock/${uData._id}`)
        return response.data
    }

    const useUpdateProfile = (username, mnKey) => {
        return useMutation({
            mutationKey: mnKey,
            mutationFn: updatedUserDetails,
            onMutate: async () =>
                await queryClient.cancelQueries({ queryKey: ["profile", username] }),
            onSuccess: ({ updatedPayload }) => {
                if (updatedPayload.username) {
                    const previousProfile = queryClient.getQueryData(["profile", username])
                    const mergedProfile = { ...previousProfile, ...updatedPayload }
                    queryClient.setQueryData(["profile", updatedPayload.username], mergedProfile)
                    dispatch(
                        updateUserData({ property: "username", value: updatedPayload.username })
                    )

                    navigate(`/profile/${updatedPayload.username}`, { replace: true })
                    queryClient.removeQueries({ queryKey: ["profile", username] })
                }

                queryClient.setQueryData(["profile", username], (prev) =>
                    prev ? { ...prev, ...updatedPayload } : updatedPayload
                )
            },
            onError: (err) => {
                console.log(err)
            },
        })
    }

    return {
        followUser,
        searchUsers,
        fetchProfile,
        privacyChange,
        getRecentSearchers,
        addToRecentSearchers,
        removeFromRecentSearchers,
        clearRecentSearchers,
        fetchFollowList,
        useProfileQuery,
        useUpdateProfile,
        blockUser,
        unblockUser,
    }
}

export default useUsers
