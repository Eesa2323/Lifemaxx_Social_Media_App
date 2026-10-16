import { useState, useEffect } from "react"
import { Outlet, useLocation, useNavigate, useNavigationType } from "react-router-dom"
import { useSelector } from "react-redux"
import useRefresh from "../hooks/useRefresh"
import Navbar from "./Navbar"

const NAVBAR_BLACKLIST = ["/login", "/signup", "/chats"]

const PersistLogin = () => {
    const token = useSelector((state) => state.auth.token)
    const [isLoading, setIsLoading] = useState(!token)
    const refresh = useRefresh()
    const location = useLocation()
    const navigate = useNavigate()
    const pathname = location.pathname
    const startPath = "/" + pathname.split("/")[1]
    const shouldDisplayNavbar = !NAVBAR_BLACKLIST.includes(startPath)
    const navType = useNavigationType()

    useEffect(() => {
        // optional: take control from the browser once on mount
        if ("scrollRestoration" in window.history) {
            const prev = window.history.scrollRestoration
            window.history.scrollRestoration = "manual"
            return () => {
                window.history.scrollRestoration = prev
            }
        }
    }, [])

    useEffect(() => {
        if (navType === "POP") {
            // when user hits Back/Forward, force desired position
            window.scrollTo({ top: 0, left: 0, behavior: "auto" })
        }
        // run on location change
    }, [location.key, navType])

    useEffect(() => {
        const verifyRefreshToken = async () => {
            try {
                console.log("Attempting to refresh token...")
                await refresh()
                console.log("Refresh successful")
            } catch (err) {
                console.log("Refresh failed, redirecting to login")
                // Only redirect if refresh fails for a previously logged in user
                navigate("/login", { replace: true })
            } finally {
                setIsLoading(false)
            }
        }

        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"

        console.log("PersistLogin debug:", {
            token: !!token,
            isLoggedIn,
            pathname,
        })

        // If user has token, no loading needed
        if (token) {
            console.log("User has token, no loading needed")
            setIsLoading(false)
            return
        }

        // If no token and not logged in, guest user - no refresh needed
        if (!isLoggedIn) {
            console.log("No token and isLoggedIn=false, guest user")
            setIsLoading(false)
            return
        }

        // If no token but was logged in, attempt refresh
        if (isLoggedIn) {
            console.log("No token but isLoggedIn=true, attempting refresh")
            setIsLoading(true)
            verifyRefreshToken()
        }
    }, [refresh, token, navigate])

    if (isLoading) {
        return null
    }

    return (
        <>
            {shouldDisplayNavbar && <Navbar />}

            <Outlet />
        </>
    )
}

export default PersistLogin
