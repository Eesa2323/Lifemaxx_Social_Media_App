import useAxiosPrivate from "../useAxiosPrivate"
import { BASE_URL } from "../../utils/config"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const useChats = () => {
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()

    const fetchChats = async () => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/chats/`)
        return response.data
    }

    const addChatToCache = (chat, isNewGroupChat = false) => {
        // isNewGroupChat && updateUnreadChatsCount(1)

        queryClient.setQueryData(["chats"], (prevChats = []) => {
            const existingChat = prevChats?.find((c) => c._id === chat._id)
            return !existingChat ? [chat, ...prevChats] : prevChats
        })
    }

    const createChat = async (userIds) => {
        const response = await axiosPrivate.post(`${BASE_URL}/api/chats/`, {
            participants: userIds,
        })
        return response.data
    }

    const createChatMutation = useMutation({
        mutationFn: (data) => createChat(data),
        onSuccess: (addedChat) => addChatToCache(addedChat),
        onError: (error) => console.log(error),
    })

    const fetchUnreadChatsCount = async () => {
        const response = await axiosPrivate.get(`${BASE_URL}/api/chats/unread`)
        return response.data
    }

    const useUnreadChatsQuery = (enabled) => {
        return useQuery({
            queryKey: ["chats", "unread_count"],
            queryFn: fetchUnreadChatsCount,
            staleTime: Infinity,
            gcTime: Infinity,
            enabled,
        })
    }

    return {
        fetchChats,
        createChatMutation,
        useUnreadChatsQuery,
    }
}

export default useChats
