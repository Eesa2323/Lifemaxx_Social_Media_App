import { axiosPrivate } from "../utils/axios"
import { useEffect } from "react"
import useRefresh from "./useRefresh"
import { useSelector } from "react-redux"

const useAxiosPrivate = () => {
    const refresh = useRefresh()
    const token = useSelector((state) => state.auth.token)

    useEffect(() => {
        const requestInterceptor = axiosPrivate.interceptors.request.use(
            (config) => {
                if (!config.headers["x-auth-token"]) config.headers["x-auth-token"] = token
                return config
            },
            (error) => Promise.reject(error)
        )

        const responseInterceptor = axiosPrivate.interceptors.response.use(
            (response) => response,
            async (error) => {
                const prevRequest = error?.config
                if (error?.response?.status === 401 && !prevRequest?.sent) {
                    prevRequest.sent = true

                    const newAccessToken = await refresh()
                    if (!newAccessToken) return Promise.reject(error)

                    prevRequest.headers["x-auth-token"] = newAccessToken
                    return axiosPrivate(prevRequest)
                }
                return Promise.reject(error)
            }
        )

        return () => {
            axiosPrivate.interceptors.request.eject(requestInterceptor)
            axiosPrivate.interceptors.response.eject(responseInterceptor)
        }
    }, [refresh, token])

    return axiosPrivate
}

export default useAxiosPrivate
