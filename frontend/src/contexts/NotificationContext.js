import { createContext, useEffect } from "react"
import { useSelector } from "react-redux"
import { useContext } from "react"
import ChatContext from "./ChatContext"
import { useQueryClient } from "@tanstack/react-query"

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
    const userId = useSelector((state) => state.auth.userData?._id)
    const queryClient = useQueryClient()
    const { ablyClient } = useContext(ChatContext)

    useEffect(() => {
        if (!ablyClient || ablyClient?.connection?.state !== "connected" || !userId) return

        const channel = ablyClient.channels.get(`notifications:${userId}`)

        const onRequest = (d) => {
            const { username } = d.data
            queryClient.invalidateQueries({ queryKey: ["profile", username], refetchType: "none" })
        }

        channel.subscribe("accepted_request", onRequest)

        return () => {
            channel.unsubscribe("accepted_request", onRequest)
        }
    }, [ablyClient, userId, queryClient])

    return <NotificationContext.Provider value={{}}>{children}</NotificationContext.Provider>
}

export default NotificationContext
