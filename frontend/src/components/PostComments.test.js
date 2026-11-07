import React from "react"
import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import PostComments from "./PostComments"
import useAxiosPrivate from "../hooks/useAxiosPrivate"

jest.mock("react-redux", () => ({
    useSelector: (selector) =>
        selector({ auth: { token: "token", userData: { _id: "user", username: "test" } } }),
}))
jest.mock("react-responsive", () => ({ useMediaQuery: () => false }))
jest.mock("../hooks/useAxiosPrivate", () => jest.fn())
jest.mock("../hooks/usePendingMutations", () => () => ({ isPendingMutations: false }))
jest.mock("../hooks/useComments", () => {
    const { useInfiniteQuery } = require("@tanstack/react-query")
    return () => ({
        useCommentsQuery: (postId, enabled, sortBy) =>
            useInfiniteQuery({
                queryKey: ["comments", postId, sortBy],
                queryFn: async () => ({ data: [] }),
                initialPageParam: undefined,
                getNextPageParam: () => undefined,
                enabled: false,
                initialData: { pages: [{ data: [] }], pageParams: [undefined] },
            }),
        useCommentsReplyQuery: (id) =>
            useInfiniteQuery({
                queryKey: ["replyComments", id],
                queryFn: async () => ({ data: [] }),
                initialPageParam: undefined,
                getNextPageParam: () => undefined,
                enabled: false,
            }),
    })
})
jest.mock("./Modal", () => ({ children, isOpen }) => (isOpen ? <div>{children}</div> : null))
jest.mock("./Comment", () => ({ c }) => <div>{c.content}</div>)
jest.mock("./MentionAutocomplete", () => () => null)
jest.mock("./ProfilePic", () => () => null)
jest.mock("./MentionText", () => () => null)

const renderComments = () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    render(
        <QueryClientProvider client={client}>
            <PostComments post={{ _id: "post", commentCount: 0 }} autoOpenComments />
        </QueryClientProvider>
    )
    return client
}

test("keeps a new draft typed while a comment is being posted", async () => {
    let resolvePost
    const post = jest.fn(() => new Promise((resolve) => { resolvePost = resolve }))
    useAxiosPrivate.mockReturnValue({ post })
    const client = renderComments()

    const input = screen.getByPlaceholderText("Add a comment...")
    fireEvent.change(input, { target: { value: "First comment" } })
    expect(input.value).toBe("First comment")
    fireEvent.submit(input.closest("form"))
    await waitFor(() => expect(post).toHaveBeenCalled())

    fireEvent.change(input, { target: { value: "Next draft" } })
    resolvePost({ data: { comment: { _id: "comment", content: "First comment" } } })
    await waitFor(() =>
        expect(client.getQueryData(["comments", "post", null]).pages[0].data[0]._id)
            .toBe("comment")
    )
    expect(input.value).toBe("Next draft")
})

test("clears an unchanged draft after it is posted", async () => {
    useAxiosPrivate.mockReturnValue({
        post: jest.fn().mockResolvedValue({
            data: { comment: { _id: "comment", content: "Posted" } },
        }),
    })
    renderComments()

    const input = screen.getByPlaceholderText("Add a comment...")
    fireEvent.change(input, { target: { value: "Posted" } })
    fireEvent.submit(input.closest("form"))
    await waitFor(() => expect(input.value).toBe(""))
})

test("preserves the draft and removes the optimistic comment when posting fails", async () => {
    const error = new Error("Request failed")
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})
    useAxiosPrivate.mockReturnValue({ post: jest.fn().mockRejectedValue(error) })
    const client = renderComments()
    client.setQueryData(["feed"], {
        pages: [{ data: [{ _id: "post", commentCount: 2 }] }],
        pageParams: [undefined],
    })

    const input = screen.getByPlaceholderText("Add a comment...")
    fireEvent.change(input, { target: { value: "Keep this draft" } })
    fireEvent.submit(input.closest("form"))

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not post your comment")
    expect(input.value).toBe("Keep this draft")
    expect(client.getQueryData(["comments", "post", null]).pages[0].data).toEqual([])
    expect(client.getQueryData(["feed"]).pages[0].data[0].commentCount).toBe(2)
    consoleError.mockRestore()
})

test("updates the displayed feed count only after a comment is saved", async () => {
    let resolvePost
    useAxiosPrivate.mockReturnValue({
        post: jest.fn(() => new Promise((resolve) => { resolvePost = resolve })),
    })
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    client.setQueryData(["feed"], {
        pages: [{ data: [{ _id: "post", commentCount: 2 }] }],
        pageParams: [undefined],
    })
    const Feed = () => {
        const { data } = useQuery({
            queryKey: ["feed"],
            queryFn: async () => client.getQueryData(["feed"]),
            enabled: false,
        })
        return <PostComments post={data.pages[0].data[0]} autoOpenComments />
    }
    render(<QueryClientProvider client={client}><Feed /></QueryClientProvider>)
    const input = screen.getByPlaceholderText("Add a comment...")
    fireEvent.change(input, { target: { value: "Hello" } })
    fireEvent.submit(input.closest("form"))
    await waitFor(() => expect(resolvePost).toBeDefined())
    expect(screen.getByText("Comments (2)")).toBeInTheDocument()

    resolvePost({ data: { comment: { _id: "comment", content: "Hello" } } })
    expect(await screen.findByText("Comments (3)")).toBeInTheDocument()
})
