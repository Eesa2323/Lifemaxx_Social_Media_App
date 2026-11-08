import React from "react"
import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import Navbar from "./Navbar"

const mockNavigate = jest.fn()
let mockToken = "token"

jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/" }),
    Link: ({ children }) => children,
}), { virtual: true })
jest.mock("react-redux", () => ({
    useSelector: (selector) => selector({
        auth: { token: mockToken, userData: { _id: "user", username: "test" } },
    }),
    useDispatch: () => jest.fn(),
}))
jest.mock("../hooks/useAxiosPrivate", () => () => ({}))
jest.mock("../contexts/SidebarContext", () => ({
    useSidebar: () => ({ collapsed: false, setCollapsed: jest.fn() }),
}))
jest.mock("./ProfilePic", () => () => null)
jest.mock("./MessagesBadge", () => () => null)
jest.mock("./SearchModal", () => ({ open }) => open ? <div>Search panel</div> : null)
jest.mock("./NotificationModal", () => ({ open }) => open ? <div>Notifications panel</div> : null)
jest.mock("./UnauthorizedLoginPopupModal", () => ({ isOpen }) =>
    isOpen ? <div>Login required</div> : null
)
jest.mock("./CreateJourneyModal", () => ({ isOpen, userId, onClose }) =>
    isOpen ? <button onClick={onClose}>Journey modal for {userId}</button> : null
)

beforeEach(() => {
    mockToken = "token"
    mockNavigate.mockClear()
    localStorage.clear()
})

test("desktop create opens the journey modal and can close it", () => {
    window.innerWidth = 1280
    render(<Navbar />)
    fireEvent.click(screen.getByRole("button", { name: "Create Journey" }))
    expect(screen.getByText("Journey modal for user")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Journey modal for user"))
    expect(screen.queryByText("Journey modal for user")).not.toBeInTheDocument()
})

test("mobile actions open the correct destinations", () => {
    window.innerWidth = 375
    render(<Navbar />)
    fireEvent.click(screen.getByRole("button", { name: "Messages" }))
    expect(mockNavigate).toHaveBeenCalledWith("/chats")
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }))
    expect(screen.getByText("Notifications panel")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Create" }))
    expect(screen.getByText("Journey modal for user")).toBeInTheDocument()
})

test("mobile create requires login for guests", () => {
    mockToken = null
    window.innerWidth = 375
    render(<Navbar />)
    fireEvent.click(screen.getByRole("button", { name: "Create" }))
    expect(screen.getByText("Login required")).toBeInTheDocument()
    expect(screen.queryByText("Journey modal for user")).not.toBeInTheDocument()
})
