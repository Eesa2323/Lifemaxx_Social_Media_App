import React, { useState, useEffect } from "react"
import Navbar from "./Navbar"
import { useLocation } from "react-router-dom"
import { useSidebar } from "../contexts/SidebarContext"

const Layout = ({ children }) => {
    const location = useLocation()
    const isAuthPage = ["/login", "/signup", "/reset-password"].includes(location.pathname)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const { collapsed } = useSidebar()

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    // Reset scroll when the route (pathname) changes.
    // Prefers a specific scrollable container if present, otherwise falls back to window.
    useEffect(() => {
        if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
            try {
                window.history.scrollRestoration = "manual"
            } catch (e) {}
        }

        const containerSelector =
            ".message-list, .message-list-container, .posts-list, #main-scroll"
        const container = document.querySelector(containerSelector)

        if (container) {
            if (typeof container.scrollTo === "function") {
                container.scrollTo({ top: 0, behavior: "instant" })
            } else {
                container.scrollTop = 0
            }
            return
        }

        if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
            window.scrollTo({ top: 0, behavior: "auto" })
        }
    }, [location.pathname])

    // For auth pages, don't show navbar and use full width
    if (isAuthPage) {
        return <div style={{ minHeight: "100vh" }}>{children}</div>
    }

    // For mobile, show navbar at top and content below
    if (isMobile) {
        return (
            <div className='app-shell mobile-shell'>
                <Navbar />
                <main
                    className='page-container'
                    style={location.pathname === "/chats"
                        ? { padding: "56px 0 60px", minHeight: "100dvh" }
                        : { paddingTop: "80px", paddingBottom: "76px" }}
                >
                    {children}
                </main>
            </div>
        )
    }

    // For desktop, show sidebar and main content area
    return (
        <div
            className='app-shell'
            style={{ minHeight: "100vh", display: "flex" }}
        >
            <Navbar />
            <main
                className='page-container'
                style={{
                    marginLeft: collapsed ? "70px" : "220px",
                    width: collapsed ? "calc(100vw - 70px)" : "calc(100vw - 220px)",
                }}
            >
                {children}
            </main>
        </div>
    )
}

const styles = {
    pageContainer: {
        flex: 1,
        marginLeft: "220px",
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        width: "calc(100vw - 220px)",
    },
}

export default Layout
