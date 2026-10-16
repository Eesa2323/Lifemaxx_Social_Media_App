// import React, { useEffect } from "react"

// const Input = ({ type, name, value, onChange, error, placeholder }) => {
//     const [width, setWidth] = React.useState(window.innerWidth)
//     const [isFocused, setIsFocused] = React.useState(false)

//     useEffect(() => {
//         const handleResize = () => setWidth(window.innerWidth)
//         window.addEventListener("resize", handleResize)

//         return () => window.removeEventListener("resize", handleResize)
//     }, [])

//     const isMobile = width <= 480

//     const inputStyles = {
//         ...styles.input,
//         padding: isMobile ? "0.8rem" : "1rem",
//         fontSize: isMobile ? "0.9rem" : "1rem",
//         borderColor: isFocused ? "#666" : error ? "#ff4444" : "#444",
//         boxShadow: isFocused ? "0 0 0 2px rgba(255, 255, 255, 0.1)" : "none",
//     }

//     const containerStyles = {
//         ...styles.inputContainer,
//         marginBottom: error ? "2.5rem" : "1.5rem",
//     }

//     return (
//         <div style={containerStyles}>
//             <div style={styles.inputWrapper}>
//                 <input
//                     type={type}
//                     name={name}
//                     value={value}
//                     onChange={onChange}
//                     placeholder={placeholder}
//                     style={inputStyles}
//                     onFocus={() => setIsFocused(true)}
//                     onBlur={() => setIsFocused(false)}
//                 />
//             </div>
//             {error && <span style={styles.error}>{error}</span>}
//         </div>
//     )
// }

// const styles = {
//     inputContainer: {
//         width: "100%",
//         position: "relative",
//     },
//     inputWrapper: {
//         width: "100%",
//         position: "relative",
//     },
//     input: {
//         width: "100%",
//         borderRadius: "8px",
//         border: "1px solid #444",
//         backgroundColor: "#222",
//         color: "white",
//         outline: "none",
//         transition: "all 0.2s ease",
//         "&::placeholder": {
//             color: "#666",
//         },
//     },
//     error: {
//         color: "#ff4444",
//         fontSize: "0.75rem",
//         position: "absolute",
//         top: "calc(100% + 0.3rem)",
//         left: "0.2rem",
//     },
// }

// export default Input

import React, { useEffect, useRef } from "react"
import { FaPaperclip } from "react-icons/fa"

const Input = ({
    type,
    name,
    value,
    onChange,
    error,
    placeholder,
    theRef,
    hasFile = false,
    onFileChange,
    compact = false, // when true, reduce vertical spacing for compact layouts
}) => {
    const [width, setWidth] = React.useState(window.innerWidth)
    const [isFocused, setIsFocused] = React.useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const isMobile = width <= 480

    const inputStyles = {
        ...styles.input,
        padding: compact ? (isMobile ? "0.5rem" : "0.7rem") : isMobile ? "0.8rem" : "1rem",
        paddingLeft: hasFile ? (isMobile ? "2.5rem" : "3rem") : undefined,
        fontSize: isMobile ? "0.9rem" : "1rem",
        borderColor: isFocused ? "#666" : error ? "#ff4444" : "#444",
        boxShadow: isFocused ? "0 0 0 2px rgba(255, 255, 255, 0.1)" : "none",
    }

    const containerStyles = {
        ...styles.inputContainer,
        // compact option reduces the bottom margin so buttons sit closer
        // but if there's an error we need more room so the error text doesn't overlap following elements
        // increase error margin further for clearer separation
        marginBottom: error ? (compact ? "1.8rem" : "2.8rem") : compact ? "0.6rem" : "1.5rem",
    }

    return (
        <div style={containerStyles}>
            <div style={styles.inputWrapper}>
                {hasFile && (
                    <FaPaperclip
                        style={styles.fileIcon}
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    />
                )}
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    ref={theRef}
                    placeholder={placeholder}
                    style={inputStyles}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                {hasFile && (
                    <input
                        type='file'
                        ref={fileInputRef}
                        style={styles.hiddenFileInput}
                        onChange={onFileChange}
                    />
                )}
            </div>
            {error && <span style={styles.error}>{error}</span>}
        </div>
    )
}

const styles = {
    inputContainer: {
        width: "100%",
        position: "relative",
    },
    inputWrapper: {
        width: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
    },
    input: {
        width: "100%",
        borderRadius: "8px",
        border: "1px solid #444",
        backgroundColor: "#222",
        color: "white",
        outline: "none",
        transition: "all 0.2s ease",
        // placeholder styling not applied inline; use global CSS if needed
    },
    fileIcon: {
        position: "absolute",
        left: "0.8rem",
        color: "#aaa",
        cursor: "pointer",
        zIndex: 1,
        fontSize: "1rem",
    },
    hiddenFileInput: {
        display: "none",
    },
    error: {
        color: "#ff4444",
        fontSize: "0.75rem",
        position: "absolute",
        // give more gap below the input so the error text has breathing room
        top: "calc(100% + 0.6rem)",
        left: "0.2rem",
    },
}

export default Input
