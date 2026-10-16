import React, { useState, useRef, useEffect } from "react"
import { BsThreeDots } from "react-icons/bs"
import { MdDelete } from "react-icons/md"

const ThreeDotsMenu = ({ onDelete, isCreator = false, position = "right" }) => {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef(null)
    const buttonRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    if (!isCreator) return null

    const handleDelete = () => {
        setIsOpen(false)
        onDelete()
    }

    return (
        <div style={styles.container}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                style={styles.button}
                aria-label='More options'
            >
                <BsThreeDots size={16} />
            </button>
            {isOpen && (
                <div
                    ref={menuRef}
                    style={{
                        ...styles.menu,
                        ...(position === "left" ? styles.menuLeft : styles.menuRight),
                    }}
                >
                    <button
                        onClick={handleDelete}
                        style={styles.menuItem}
                    >
                        <MdDelete
                            size={16}
                            style={styles.deleteIcon}
                        />
                        Delete
                    </button>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: {
        position: "relative",
        display: "inline-block",
    },
    button: {
        background: "none",
        border: "none",
        color: "#999",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.2s, background-color 0.2s",
        "&:hover": {
            color: "#fff",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
    },
    menu: {
        position: "absolute",
        top: "100%",
        backgroundColor: "#2a2a2a",
        border: "1px solid #444",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
        minWidth: "120px",
        marginTop: "4px",
    },
    menuRight: {
        right: 0,
    },
    menuLeft: {
        left: 0,
    },
    menuItem: {
        width: "100%",
        padding: "8px 12px",
        background: "none",
        border: "none",
        color: "#ff4444",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        transition: "background-color 0.2s",
        "&:hover": {
            backgroundColor: "rgba(255, 68, 68, 0.1)",
        },
        "&:first-child": {
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
        },
        "&:last-child": {
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
        },
    },
    deleteIcon: {
        color: "#ff4444",
    },
}

export default ThreeDotsMenu
