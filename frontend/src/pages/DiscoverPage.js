import React, { useState, useEffect } from "react"
import { BASE_URL } from "../utils/config"
import { useNavigate } from "react-router-dom"
import JourneyGallery from "../components/JourneyGallery"

const styles = {
    container: {
        height: "100%",
        color: "white",
        padding: "24px 16px",
        marginTop: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    header: {
        maxWidth: 960,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#ccc",
        marginBottom: 24,
    },
    controls: {
        display: "flex",
        gap: 12,
        marginBottom: 24,
        flexWrap: "wrap",
    },
    input: {
        flex: 1,
        minWidth: 350,
        width: "100%",
        maxWidth: 800,
        padding: "8px 12px",
        borderRadius: 12,
        backgroundColor: "#1c1c1c",
        color: "white",
        border: "1px solid #333",
    },
    select: {
        padding: "8px 12px",
        borderRadius: 12,
        backgroundColor: "#1c1c1c",
        color: "white",
        border: "1px solid #333",
        minWidth: 120,
    },
    list: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        maxWidth: 960,
        padding: "0 8px",
        "@media (min-width: 768px)": {
            padding: 0,
        },
    },
    modalImage: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
    },
    modalContent: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "#1c1c1c",
        padding: 16,
        borderRadius: 12,
        outline: "none",
        maxWidth: "90vw",
        maxHeight: "90vh",
        width: "50vw",
        height: "50vh",
    },
    noResults: {
        textAlign: "center",
        color: "#555",
        width: "100%",
        padding: "40px 0",
    },
    "@media (max-width: 600px)": {
        modalContent: {
            width: "90vw",
            height: "90vh",
        },
    },
}

const CATEGORIES = [
    { id: "Fitness", title: "Fitness", icon: "💪" },
    { id: "Money", title: "Money", icon: "💼" },
    { id: "Self-Improvement", title: "Self-Improvement", icon: "🎯" },
    { id: "Looksmaxxing", title: "Looksmaxxing", icon: "✨" },
]

const DiscoverPage = () => {
    const [searchTerm, setSearchTerm] = useState("")
    const [filter, setFilter] = useState("all")
    const navigate = useNavigate()

    return (
        <div className='page-wrapper discover-page'>
            <div className='page-header'>
                <div>
                    <h1 className='page-title'>Discover</h1>
                    <p className='page-subtitle'>Explore curated content to help you grow.</p>
                </div>
                <div className='page-actions'>
                    <input
                        type='text'
                        placeholder='Search...'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.input}
                        onKeyDown={(e) => {
                            /* Enter key can be used to trigger a refresh if needed. JourneyGallery reacts to state changes. */
                        }}
                    />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={styles.select}
                    >
                        <option value='all'>All</option>
                        <option value='Lifemaxxing'>Lifemaxxing</option>
                        <option value='Fitness'>Fitness</option>
                        <option value='Money'>Money</option>
                    </select>
                </div>
            </div>
            <div style={styles.list}>
                <JourneyGallery
                    mode='discover'
                    searchTerm={searchTerm}
                    filter={filter}
                />
            </div>
        </div>
    )
}

export default DiscoverPage
