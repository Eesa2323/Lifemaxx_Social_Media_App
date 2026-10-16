import React, { useContext, useState } from "react"
import { IconButton, Menu, MenuItem } from "@mui/material"
import { BsThreeDotsVertical as DotsIcon } from "react-icons/bs"
import ChatContext from "../contexts/ChatContext"
import { useMutation } from "@tanstack/react-query"
import useAxiosPrivate from "../hooks/useAxiosPrivate"
import { BASE_URL } from "../utils/config"

export default function MessageOptions({ m, isOwn }) {
    const { activeMessageMenu, updateActiveMessageMenu, deleteMessageFromCache } =
        useContext(ChatContext)
    const [hover, setHover] = useState(false)
    const open = Boolean(activeMessageMenu._id === m._id)
    const axiosPrivate = useAxiosPrivate()
    const rootContainerStyles = {
        width: "100%",
        height: "auto",
    }

    const deleteMessageMutation = useMutation({
        mutationFn: async ({ messageId, chatId }) => {
            const response = await axiosPrivate.delete(
                `${BASE_URL}/api/messages/${messageId}/${chatId}`
            )

            return response.data
        },
        onSuccess: (data) => {
            const { deletedMessage } = data
            deleteMessageFromCache(deletedMessage, deletedMessage.chat)
        },
        onError: (err) => {
            console.log(err)
        },
        onSettled: () => updateActiveMessageMenu({}),
    })

    return (
        <div style={rootContainerStyles}>
            <div
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{
                    width: 125,
                    height: "100%",
                    justifyContent: "center",
                    display: "flex",
                    alignItems: "center",
                    marginLeft: isOwn ? "auto" : 0,
                }}
            >
                <div
                    onClick={(e) =>
                        updateActiveMessageMenu({ element: e.currentTarget, _id: m._id })
                    }
                    style={{
                        width: 30,
                        marginLeft: isOwn ? "auto" : 0,
                        justifySelf: "center",
                    }}
                    // onClick={(e) =>
                    //     updateActiveMessageMenu({ element: e.currentTarget, _id: message._id })
                    // }
                >
                    <DotsIcon
                        style={{ display: hover || open ? "block" : "none" }}
                        size={20}
                    />
                </div>
            </div>

            <Menu
                open={open}
                onClose={() => {
                    setHover(false)
                    updateActiveMessageMenu({})
                }}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: isOwn ? "left" : "right",
                }}
                transformOrigin={{ vertical: 100, horizontal: isOwn ? "right" : "left" }}
                anchorEl={activeMessageMenu?.element ?? null}
                slotProps={{ paper: { style: styles.popupContainer } }}
            >
                {isOwn && (
                    <MenuItem
                        onClick={() =>
                            deleteMessageMutation.mutate({ messageId: m._id, chatId: m.chat })
                        }
                    >
                        <span
                            style={styles.optionText}
                            className='roboto-medium'
                        >
                            Delete
                        </span>
                    </MenuItem>
                )}

                <MenuItem>
                    <span
                        style={styles.optionText}
                        className='roboto-medium'
                    >
                        Reply
                    </span>
                </MenuItem>
            </Menu>
        </div>
    )
}

const styles = {
    popupContainer: {
        width: 150,
        height: 100,
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        backgroundColor: "#222222",
    },
    optionText: {
        fontSize: 14,
        color: "white",
    },
}
