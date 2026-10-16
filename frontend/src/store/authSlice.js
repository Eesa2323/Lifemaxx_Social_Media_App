import { createSlice } from "@reduxjs/toolkit"

export const authSlice = createSlice({
    name: "auth",
    initialState: {
        token: null,
        userData: null,
        uiData: {
            openNavbarModal: "",
        },
    },
    reducers: {
        setCredentials: (state, action) => {
            const { userData, token } = action.payload
            state.token = token
            state.userData = userData
        },

        updateUserData: (state, action) => {
            const { property, value } = action.payload
            state.userData[property] = value
        },

        setToken: (state, action) => {
            const { token } = action.payload
            state.token = token
        },
    },
})

export const { setCredentials, updateUserData, setToken } = authSlice.actions
export default authSlice.reducer
