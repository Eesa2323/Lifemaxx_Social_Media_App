import useAxiosPrivate from "../useAxiosPrivate"
import { BASE_URL } from "../../utils/config"

const useMessages = () => {
    const axiosPrivate = useAxiosPrivate()

    const createMessage = async (data) => {
        const { chatId, file, messageText, reply } = data
        const formData = new FormData()

        formData.append("messageText", messageText)
        file && formData.append("file", file)
        reply && formData.append("reply", reply)

        const response = await axiosPrivate.post(`${BASE_URL}/api/messages/${chatId}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        return response.data
    }

    const fetchMessages = async ({ pageParam, queryKey, signal }) => {
        const [_, chatId] = queryKey

        const response = await axiosPrivate.get(`${BASE_URL}/api/messages/${chatId}/${pageParam}`, {
            signal,
        })

        return response.data
    }

    return { createMessage, fetchMessages }
}

export default useMessages
