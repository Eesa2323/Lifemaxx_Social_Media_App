import React, { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import { setCredentials } from "../store/authSlice"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import {
    BiMessageSquareDetail as MessagesIcon,
    BiGroup,
    BiUser,
    BiSearch,
    BiMessage,
    BiBell,
    BiUserCircle,
    BiPlusCircle,
    BiCompass,
    BiHomeAlt as HomeIcon,
    BiArrowBack,
} from "react-icons/bi"
import ProfilePic from "./ProfilePic"
import MessagesBadge from "./MessagesBadge"
import { UserSearch } from "lucide-react"
import SearchModal from "./SearchModal"
import NotificationModal from "./NotificationModal"
import { BASE_URL } from "../utils/config"
import NotificationSidebar from "./NotificationModal"
import SearchSidebar from "./SearchModal"
import UnauthorizedLoginPopupModal from "./UnauthorizedLoginPopupModal"
import { useSidebar } from "../contexts/SidebarContext"
import { RiUserCommunityFill as CommunityIcon } from "react-icons/ri"
import { FaNetworkWired as ConnectIcon } from "react-icons/fa"

const Navbar = ({ style = {}, visible = true }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const axiosPrivate = useAxiosPrivate()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [openModal, setOpenModal] = useState("")
    const { collapsed, setCollapsed } = useSidebar()
    const location = useLocation()

    // Get auth state from Redux
    const { token, userData } = useSelector((state) => state.auth)
    const [isLoading, setIsLoading] = useState(
        !token && localStorage.getItem("isLoggedIn") === "true",
    )

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    useEffect(() => {
        // Update loading state when token changes
        if (token) {
            setIsLoading(false)
        } else if (localStorage.getItem("isLoggedIn") !== "true") {
            setIsLoading(false)
        }
    }, [token])

    useEffect(() => {
        // Collapse sidebar when notifications or search are open, or when on /chats
        if (
            openModal === "notifications" ||
            openModal === "search" ||
            location.pathname === "/chats"
        ) {
            setCollapsed(true)
        } else {
            setCollapsed(false)
        }
    }, [openModal, location.pathname])

    const handleLogout = async () => {
        try {
            await axiosPrivate.post("/api/auth/logout")
            return navigate("/login", { replace: true, state: { logout: true } })
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    if (!visible) {
        return null
    }

    // --- Sidebar for Desktop ---
    if (!isMobile) {
        return (
            <>
                <aside
                    className={`sidebar ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}
                    style={{
                        ...sidebarStyles.sidebar,
                        width: collapsed ? 70 : 220,
                        alignItems: collapsed ? "center" : "flex-start",
                        transition: "width 0.3s",
                    }}
                >
                    {!collapsed && openModal !== "notifications" && openModal !== "search" && (
                        <div
                            onClick={() => navigate("/")}
                            className='sidebar-brand'
                        >
                            <span>LifeMax</span>
                        </div>
                    )}
                    <nav
                        className='sidebar-menu'
                        style={sidebarStyles.menu}
                    >
                        <SidebarItem
                            icon={
                                <div className='icon-wrapper'>
                                    <HomeIcon
                                        size={21}
                                        color='var(--text-muted)'
                                    />
                                </div>
                            }
                            label={collapsed ? null : "Home"}
                            to='/'
                            onClick={() => setOpenModal("")}
                        />
                        <SidebarItem
                            icon={
                                <div className='icon-wrapper'>
                                    <BiGroup
                                        size={21}
                                        color='var(--text-muted)'
                                    />
                                </div>
                            }
                            label={collapsed ? null : "Communities"}
                            to='/communities'
                            onClick={() => setOpenModal("")}
                        />
                        <SidebarItem
                            icon={
                                <BiUser
                                    size={21}
                                    color='var(--text-muted)'
                                />
                            }
                            label={collapsed ? null : "Connect"}
                            to='/connect'
                            onClick={() => setOpenModal("")}
                        />
                        <SidebarItem
                            icon={
                                <BiSearch
                                    size={21}
                                    color='var(--text-muted)'
                                />
                            }
                            label={collapsed ? null : "Search"}
                            onClick={() => setOpenModal("search")}
                        />
                        <SidebarItem
                            icon={
                                <BiCompass
                                    size={21}
                                    color='var(--text-muted)'
                                />
                            }
                            label={collapsed ? null : "Discover"}
                            to='/discover'
                            onClick={() => setOpenModal("")}
                        />

                        <div
                            onClick={() => {
                                setOpenModal("")
                                navigate("/chats")
                            }}
                            style={sidebarStyles.menuItem}
                        >
                            <MessagesBadge />
                            {!collapsed && <span style={sidebarStyles.label}>Messages</span>}
                        </div>
                        <div
                            onClick={() => {
                                if (!token) {
                                    // Show login popup for notifications
                                    setOpenModal("login-required")
                                } else {
                                    setOpenModal("notifications")
                                }
                            }}
                            style={sidebarStyles.menuItem}
                        >
                            <BiBell
                                size={21}
                                color='#aaa'
                            />
                            {!collapsed && <span style={sidebarStyles.label}>Notifications</span>}
                        </div>
                        <div
                            onClick={() => {
                                if (!token) {
                                    setOpenModal("login-required")
                                } else {
                                    setOpenModal("")
                                    navigate(`/profile/${userData?.username}`)
                                }
                            }}
                            style={sidebarStyles.menuItem}
                        >
                            <span style={sidebarStyles.icon}>
                                <ProfilePic
                                    src={
                                        userData?.profilePic &&
                                        `${BASE_URL}/uploads/profilePics/${userData.profilePic}`
                                    }
                                    size={25}
                                />
                            </span>
                            {!collapsed && <span style={sidebarStyles.label}>Profile</span>}
                        </div>
                    </nav>
                    {!collapsed && (
                        <div className='sidebar-footer'>
                            <span>Stay connected with local moments.</span>
                            <strong>Discover and engage faster.</strong>
                        </div>
                    )}
                </aside>
                {/* Notification Sidebar */}
                <NotificationSidebar
                    open={openModal === "notifications"}
                    onClose={() => setOpenModal("")}
                    isMobile={false}
                    left
                    sidebarWidth={collapsed ? 70 : 220}
                />
                {/* Search Sidebar */}
                <SearchSidebar
                    open={openModal === "search"}
                    onClose={() => setOpenModal("")}
                    isMobile={false}
                    left
                    sidebarWidth={collapsed ? 70 : 220}
                />
                {/* Login Required Popup */}
                <UnauthorizedLoginPopupModal
                    isOpen={openModal === "login-required"}
                    onClose={() => setOpenModal("")}
                    title='Login Required'
                />
            </>
        )
    }

    // --- Top Header for Mobile ---
    return (
        <>
            <nav
                className='mobile-header'
                style={{ ...mobileStyles.header, ...style }}
            >
                <div style={mobileStyles.left}>
                    <span style={mobileStyles.brand}>LifeMax</span>
                </div>
                <div style={mobileStyles.center}></div>
                <div style={mobileStyles.right}>
                    {/* Discover */}
                    <button
                        className='mobile-icon-button'
                        style={{
                            ...mobileStyles.iconButton,
                            ...{ marginBottom: 1, marginRight: 14 },
                        }}
                        onClick={() => {
                            setOpenModal("")
                            navigate("/discover")
                        }}
                        aria-label='Discover'
                    >
                        <BiCompass
                            size={25}
                            color='#aaa'
                        />
                    </button>

                    {/* Messages Icon */}
                    <button
                        className='mobile-icon-button'
                        style={{
                            ...mobileStyles.iconButton,
                            ...{ marginTop: 2, marginRight: 12 },
                        }}
                        onClick={() => {
                            setOpenModal("")
                            navigate("/chats")
                        }}
                        aria-label='Messages'
                    >
                        <BiMessage
                            size={24}
                            color='#aaa'
                        />
                    </button>
                    {/* Notifications Icon Only */}
                    <button
                        className='mobile-icon-button'
                        style={mobileStyles.iconButton}
                        onClick={() => {
                            if (!token) {
                                // Show login popup for notifications
                                setOpenModal("login-required")
                            } else {
                                setOpenModal("notifications")
                            }
                        }}
                        aria-label='Notifications'
                    >
                        <BiBell
                            size={26}
                            color='#aaa'
                        />
                    </button>
                </div>
            </nav>
            {/* Fixed Bottom Bar */}
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    width: "100%",
                    zIndex: 1001,
                    backgroundColor: "var(--surface)",
                    borderTop: "1px solid var(--border)",
                    height: 60,
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                }}
            >
                {/* Home */}
                <button
                    style={mobileStyles.iconButton}
                    onClick={() => {
                        setOpenModal("")
                        navigate("/")
                    }}
                    aria-label='Home'
                >
                    <HomeIcon
                        size={25}
                        color='#aaa'
                    />
                </button>

                {/* Search */}
                <button
                    style={mobileStyles.iconButton}
                    onClick={() => setOpenModal("search")}
                    aria-label='Search'
                >
                    <BiSearch
                        size={24}
                        color='#aaa'
                    />
                </button>
                {/* Communities */}
                <button
                    style={mobileStyles.iconButton}
                    onClick={() => {
                        setOpenModal("")
                        navigate("/communities")
                    }}
                    aria-label='Communities'
                >
                    <CommunityIcon
                        size={25}
                        color='#aaa'
                    />
                </button>
                {/* Connect */}
                <button
                    style={mobileStyles.iconButton}
                    onClick={() => {
                        setOpenModal("")
                        navigate("/connect")
                    }}
                    aria-label='Connect'
                >
                    <ConnectIcon
                        size={24}
                        color='#aaa'
                    />
                </button>

                {/* Create */}

                {/* Profile */}
                <button
                    style={{
                        ...mobileStyles.iconButton,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        marginTop: 9,
                    }}
                    onClick={() => {
                        if (!token) {
                            setOpenModal("login-required")
                        } else {
                            setOpenModal("")
                            navigate(`/profile/${userData?.username}`)
                        }
                    }}
                    aria-label='Profile'
                >
                    <ProfilePic
                        src={
                            userData?.profilePic &&
                            `${BASE_URL}/uploads/profilePics/${userData.profilePic}`
                        }
                        size={26}
                    />
                </button>
            </div>

            {/* Notification Sidebar for Mobile */}
            <NotificationSidebar
                open={openModal === "notifications"}
                onClose={() => setOpenModal("")}
                isMobile={true}
                left
            />
            {/* Search Sidebar for Mobile */}
            <SearchSidebar
                open={openModal === "search"}
                onClose={() => setOpenModal("")}
                isMobile={true}
                left
            />
            {/* Login Required Popup for Mobile */}
            <UnauthorizedLoginPopupModal
                isOpen={openModal === "login-required"}
                onClose={() => setOpenModal("")}
                title='Login Required'
            />
        </>
    )
}

// SidebarItem helper
const SidebarItem = ({ icon, label, to, onClick }) => {
    const navigate = useNavigate()
    return (
        <div
            className='sidebar-item'
            style={sidebarStyles.menuItem}
            onClick={() => {
                navigate(to)
                onClick && onClick()
            }}
        >
            <span
                className='icon-wrapper'
                style={sidebarStyles.icon}
            >
                {icon}
            </span>
            {label && (
                <span
                    className='label'
                    style={sidebarStyles.label}
                >
                    {label}
                </span>
            )}
        </div>
    )
}

// Sidebar sidebarStyles
const sidebarStyles = {
    sidebar: {
        position: "fixed",
        left: 0,
        top: 0,
        width: 220,
        height: "100vh",
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "1.5rem 0.5rem 1rem",
        zIndex: 1000,
        boxShadow: "2px 0 18px rgba(0,0,0,0.25)",
    },
    brandSection: {
        marginBottom: 20,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    brand: {
        color: "var(--highlight)",
        fontSize: "1.75rem",
        fontWeight: "bold",
        letterSpacing: 1,
    },
    menu: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
    },
    menuItem: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0.6rem 0.85rem",
        borderRadius: 12,
        color: "var(--text)",
        fontSize: 16,
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.2s, transform 0.2s",
        width: "100%",
        userSelect: "none",
    },
    icon: {
        display: "flex",
        alignItems: "center",
        fontSize: 21,
    },
    label: {
        fontSize: 15,
        fontWeight: 500,
        color: "var(--text)",
    },
    userSection: {
        marginTop: "auto",
        padding: "1rem",
        borderTop: "1px solid #333",
        display: "flex",
        alignItems: "center",
        gap: 12,
    },
    profilePic: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        objectFit: "cover",
    },
    profilePlaceholder: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        backgroundColor: "#333",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    authButton: {
        background: "none",
        border: "1px solid #333",
        color: "#fff",
        padding: "0.5rem 1rem",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 14,
        textDecoration: "none",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#333",
        },
    },
    signupButton: {
        background: "#ff4444",
        border: "1px solid #ff4444",
        color: "#fff",
        padding: "0.5rem 1rem",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 14,
        textDecoration: "none",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#cc3333",
        },
    },
}

// Mobile sidebarStyles
const mobileStyles = {
    header: {
        backgroundColor: "var(--surface)",
        position: "fixed",
        width: "100%",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 2px 18px rgba(0, 0, 0, 0.22)",
        display: "flex",
        alignItems: "center",
        height: 60,
        padding: "0 1rem",
        justifyContent: "space-between",
    },
    left: {
        flex: 1,
        display: "flex",
        alignItems: "center",
    },
    center: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    right: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    brand: {
        color: "#ff4444",
        fontSize: "1.5rem",
        fontWeight: "bold",
        textDecoration: "none",
        flexShrink: 0,
        zIndex: 1001,
    },
    iconButton: {
        background: "none",
        border: "none",
        color: "#fff",
        fontSize: 24,
        cursor: "pointer",
        marginLeft: 8,
    },
    menuButton: {
        background: "none",
        border: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: 32,
        height: 32,
        cursor: "pointer",
        zIndex: 1001,
    },
    menuIcon: {
        width: 24,
        height: 3,
        backgroundColor: "#fff",
        margin: "3px 0",
        borderRadius: 2,
        transition: "all 0.3s",
    },
    mobileMenu: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(17, 17, 17, 0.98)",
        transition: "all 0.3s ease",
        zIndex: 1000,
    },
    mobileMenuContent: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "2rem",
        gap: "1.5rem",
    },
}

export default Navbar
