import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { BASE_URL } from "../utils/config"
import useAxiosPrivate from "./useAxiosPrivate"
import { produce } from "immer"
import axios from "../utils/axios"
import { useSelector } from "react-redux"

const usePosts = () => {
    const axiosPrivate = useAxiosPrivate()
    const queryClient = useQueryClient()
    const token = useSelector((state) => state.auth.token)
    const useCommentsQuery = (postId, enabled = true, sortBy = null) => {
        return useInfiniteQuery({
            queryKey: ["comments", postId, sortBy],
            initialPageParam: undefined,
            queryFn: async ({ pageParam = null }) => {
                const params = { cursor: pageParam, id: postId }
                if (sortBy === "mentions") params.sortBy = sortBy

                const response = await axios.get(`${BASE_URL}/api/posts/comments`, {
                    params,
                    headers: { "x-auth-token": token },
                })
                return response.data
            },
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            staleTime: 4 * 60 * 1000,
            gcTime: 3 * 60 * 1000,
            enabled,
        })
    }

    const useCommentsReplyQuery = (commentId, enabled) => {
        return useInfiniteQuery({
            queryKey: ["replyComments", commentId],
            queryFn: async ({ pageParam = null }) => {
                const response = await axios.get(`${BASE_URL}/api/posts/comments/replies`, {
                    params: { cursor: pageParam, id: commentId },
                    headers: { "x-auth-token": token },
                })
                return response.data
            },
            initialPageParam: undefined,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            enabled,
            staleTime: 4 * 60 * 1000,
            gcTime: 3 * 60 * 1000,
            retry: false,
        })
    }

    return {
        useCommentsQuery,
        useCommentsReplyQuery,
    }
}

export default usePosts
