import useAxiosPrivate from "./useAxiosPrivate"
import { BASE_URL } from "../utils/config"

const useNotifications = () => {
    const axiosPrivate = useAxiosPrivate()

    const fetchNotifications = async ({ pageParam }) => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/notifications/`, {
            params: { timestamp: pageParam ?? "" },
        })
        return response.data
    }

    const fetchRequests = async ({ pageParam }) => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/notifications/requests/`, {
            params: { timestamp: pageParam ?? "" },
        })
        return response.data
    }

    const handleFollowRequest = async (data) => {
        const { requestId, value } = data
        const response = await axiosPrivate.put(
            `${BASE_URL}/api/notifications/handle_follow_request/${requestId}`,
            { value }
        )

        return response.data
    }

    const fetchUnreadNotifcationCount = async () => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/notifications/get_unread_count`)
        return response.data
    }

    const updateNotificationTimestamp = async () => {
        const response = await axiosPrivate.put(
            `${BASE_URL}/api/notifications/update_read_timestamp`
        )
        return response.data
    }

    return {
        fetchNotifications,
        fetchRequests,
        handleFollowRequest,
        fetchUnreadNotifcationCount,
        updateNotificationTimestamp,
    }
}

export default useNotifications
