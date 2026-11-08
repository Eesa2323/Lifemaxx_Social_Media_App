import React from "react"
import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import Chats from "./Chats"
import ChatContext from "../contexts/ChatContext"

const mockSelectChat = jest.fn()
const mockNavigate = jest.fn()

jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
}), { virtual: true })
jest.mock("react-responsive", () => ({ useMediaQuery: () => true }))
jest.mock("../contexts/ChatContext", () => ({
    __esModule: true,
    default: require("react").createContext(),
}))
jest.mock("react-redux", () => ({
    useSelector: (selector) => selector({ auth: { token: "token", userData: { _id: "me" } } }),
}))
jest.mock("@tanstack/react-query", () => ({
    useQueryClient: () => ({}),
    useQuery: () => ({
        isFetching: false,
        data: [{ _id: "chat", privateChatKey: "me-other", users: [{ _id: "me" }, { _id: "other", username: "Friend" }] }],
    }),
}))
jest.mock("../hooks/chats/useChats", () => () => ({ fetchChats: jest.fn() }))
jest.mock("../components/ProfilePic", () => () => null)
jest.mock("../components/CreateChat", () => () => <button>New chat</button>)
jest.mock("../components/ChatWindow", () => ({ updateSelectedChatData }) =>
    <button onClick={() => updateSelectedChatData(null)}>Back to conversations</button>
)
jest.mock("../components/UnauthorizedLoginPopupModal", () => () => null)

const renderChats = (selectedChatData = null) =>
    render(
        <ChatContext.Provider value={{
            selectedChatData,
            updateSelectedChatData: mockSelectChat,
            updateUnreadChatsCount: jest.fn(),
        }}>
            <Chats />
        </ChatContext.Provider>
    )

beforeEach(() => mockSelectChat.mockClear())

test("shows the conversation list and selects a chat on mobile", () => {
    renderChats()
    fireEvent.click(screen.getByText("Friend"))
    expect(mockSelectChat).toHaveBeenCalledWith({ chatId: "chat" })
    expect(screen.queryByText("Back to conversations")).not.toBeInTheDocument()
})

test("shows the conversation and back control for a new group chat", () => {
    renderChats({ privateChatKey: "", newChatData: { selectedUsers: [] } })
    fireEvent.click(screen.getByText("Back to conversations"))
    expect(mockSelectChat).toHaveBeenCalledWith(null)
    expect(screen.queryByText("New chat")).not.toBeInTheDocument()
})
