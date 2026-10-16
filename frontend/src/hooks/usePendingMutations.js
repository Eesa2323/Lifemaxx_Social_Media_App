import { useMutationState } from "@tanstack/react-query"

const usePendingMutations = (mutationKey, exact = false) => {
    const pendingMutations = useMutationState({
        filters: {
            mutationKey,
            status: "pending",
            exact: exact,
        },
    })

    const isPendingMutations = pendingMutations?.length > 0

    return { pendingMutations, isPendingMutations }
}

export default usePendingMutations
