import { createContext, useCallback, useContext, useEffect, useState } from "react"

// Create context with default values
const PostsContext = createContext({
    getStoryViewedTimestamp: () => null,
    updateStoryViewedTimestamps: () => {},
})

export function PostsProvider({ children }) {
    const [storyViewedTimestamps, setStoryViewedTimestamps] = useState({})

    const getStoryViewedTimestamp = (userId) => {
        return storyViewedTimestamps[userId]
    }

    const updateStoryViewedTimestamps = useCallback((userId, value) => {
        setStoryViewedTimestamps((prev) => ({ ...prev, [userId]: value }))
    }, [])

    return (
        <PostsContext.Provider value={{ getStoryViewedTimestamp, updateStoryViewedTimestamps }}>
            {children}
        </PostsContext.Provider>
    )
}

// Custom hook to use the PostsContext
export function usePostsContext() {
    const context = useContext(PostsContext)
    if (!context) {
        throw new Error("usePostsContext must be used within a PostsProvider")
    }
    return context
}

export default PostsContext
