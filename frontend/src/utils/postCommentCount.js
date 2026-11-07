const postListKeys = ["feed", "communityPosts", "journeyPosts"]

export async function updatePostCommentCount(queryClient, postId, change) {
    const keys = [...postListKeys.map((key) => [key]), ["post", postId]]
    await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })))

    const updatePost = (post) =>
        post?._id === postId
            ? { ...post, commentCount: Math.max(0, (post.commentCount || 0) + change) }
            : post

    postListKeys.forEach((key) => {
        queryClient.setQueriesData({ queryKey: [key] }, (old) => {
            if (!old?.pages) return old
            return {
                ...old,
                pages: old.pages.map((page) => ({
                    ...page,
                    data: page.data?.map(updatePost),
                })),
            }
        })
    })
    queryClient.setQueryData(["post", postId], updatePost)
}
