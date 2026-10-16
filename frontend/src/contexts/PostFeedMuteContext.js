import React, { createContext, useContext, useState } from "react"

const PostFeedMuteContext = createContext({
    isMuted: true,
    setIsMuted: () => {},
})

export const PostFeedMuteProvider = ({ children, defaultMuted = true }) => {
    const [isMuted, setIsMuted] = useState(defaultMuted)
    return (
        <PostFeedMuteContext.Provider value={{ isMuted, setIsMuted }}>
            {children}
        </PostFeedMuteContext.Provider>
    )
}

export const usePostFeedMute = () => useContext(PostFeedMuteContext)

export default PostFeedMuteContext
