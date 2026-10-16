import { produce } from "immer"
import { validateAuthInput } from "./authValidation"

export const initializeSettingsForm = (profileInfo) => ({
    username: { value: profileInfo.username ?? "", error: "" },
    bio: { value: profileInfo.bio ?? "", error: "" },
    location: { value: profileInfo.location ?? "", error: "" },
    interests: { value: profileInfo.interests ?? [], error: "" },
})

export const settingsFormReducer = (state, action) => {
    switch (action.type) {
        case "RESET":
            return initializeSettingsForm(action.payload)
        case "UPDATE": {
            const { field, value, error } = action.payload
            return { ...state, [field]: { value, error } }
        }
        default:
            return state
    }
}

export const changePasswordFormReducer = (state, action) => {
    switch (action.type) {
        case "RESET":
            return action.payload
        case "UPDATE": {
            const { field, value } = action.payload

            return produce(state, (draft) => {
                draft.fields[field].value = value

                if (!value) {
                    draft.fields[field].error = ""
                } else {
                    const validationResult = validateAuthInput("password", value)
                    const error = validationResult?.["password"]?.[0] ?? ""
                    draft.fields[field].error = error
                }

                const password = draft.fields.password.value
                const confirmPassword = draft.fields.confirmPassword.value

                if (password && confirmPassword && password !== confirmPassword) {
                    draft.fields.confirmPassword.error = "Passwords do not match"
                } else {
                    draft.fields.confirmPassword.error = ""
                }

                draft.isFormValid = Object.values(draft.fields).every(
                    (f) => !f.error && f.value !== ""
                )
            })
        }
        default:
            return state
    }
}
