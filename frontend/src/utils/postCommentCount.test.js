import { QueryClient } from "@tanstack/react-query"
import { updatePostCommentCount } from "./postCommentCount"

test("updates matching posts in every cached feed, community, journey and single post", async () => {
    const client = new QueryClient()
    const page = { pages: [{ data: [{ _id: "post", commentCount: 2 }, { _id: "other", commentCount: 7 }] }], pageParams: [undefined] }
    const keys = [["feed"], ["communityPosts", "community", "newest"], ["communityPosts", "community", "oldest"], ["journeyPosts", "journey"]]
    keys.forEach((key) => client.setQueryData(key, page))
    client.setQueryData(["post", "post"], { _id: "post", commentCount: 2 })

    await updatePostCommentCount(client, "post", 1)

    keys.forEach((key) => {
        expect(client.getQueryData(key).pages[0].data).toEqual([
            { _id: "post", commentCount: 3 },
            { _id: "other", commentCount: 7 },
        ])
    })
    expect(client.getQueryData(["post", "post"]).commentCount).toBe(3)

    await updatePostCommentCount(client, "post", -4)
    expect(client.getQueryData(["feed"]).pages[0].data[0].commentCount).toBe(0)
    expect(client.getQueryData(["post", "post"]).commentCount).toBe(0)
})

test("does not create empty post caches", async () => {
    const client = new QueryClient()
    await updatePostCommentCount(client, "post", 1)
    expect(client.getQueryData(["post", "post"])).toBeUndefined()
    expect(client.getQueryData(["feed"])).toBeUndefined()
})
