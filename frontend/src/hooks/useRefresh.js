import axios from "axios"
import { BASE_URL } from "../utils/config"
import { useCallback } from "react"
import { useDispatch } from "react-redux"
import { setCredentials } from "../store/authSlice"

const useRefresh = () => {
    const dispatch = useDispatch()

    const refresh = useCallback(async () => {
        try {
            const result = await axios.get(`${BASE_URL}/api/auth/refresh_token`, {
                withCredentials: true,
            })

            dispatch(setCredentials({ token: result.data.token, userData: result.data.userData }))
            localStorage.setItem("isLoggedIn", "true")
            return result.data.token
        } catch (err) {
            console.log(err)
            localStorage.removeItem("isLoggedIn")
            // Don't redirect here, let the calling component handle it
            throw err
        }
    }, [dispatch])

    return refresh
}

export default useRefresh
