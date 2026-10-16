import React, { useEffect, useReducer, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import Input from "../components/Input"
import Button from "../components/Button"
import { BASE_URL } from "../utils/config"
import { setCredentials } from "../store/authSlice"
import { useDispatch } from "react-redux"

const initialState = {
    identifier: {
        value: "",
        error: "",
        touched: false,
    },
    password: {
        value: "",
        error: "",
        touched: false,
    },
    formError: "",
    formIsValid: false,
}

const formReducer = (state, action) => {
    switch (action.type) {
        case "SET_FIELD": {
            const newState = {
                ...state,
                [action.field]: {
                    ...state[action.field],
                    value: action.value,
                    touched: true,
                },
            }
            const updatedState = {
                ...newState,
                identifier: {
                    ...newState.identifier,
                    error:
                        newState.identifier.touched && !newState.identifier.value
                            ? "Username or email is required"
                            : "",
                },
                password: {
                    ...newState.password,
                    error:
                        newState.password.touched && !newState.password.value
                            ? "Password is required"
                            : "",
                },
            }

            const hasAllValues = updatedState.identifier.value && updatedState.password.value

            const hasNoErrors = !updatedState.identifier.error && !updatedState.password.error

            return {
                ...updatedState,
                formIsValid: hasAllValues && hasNoErrors,
            }
        }
        case "SET_FORM_ERROR":
            return {
                ...state,
                formError: action.error,
            }
        case "VALIDATE_ALL": {
            // When submitting, mark all fields as touched and validate
            const updatedState = {
                ...state,
                identifier: {
                    ...state.identifier,
                    touched: true,
                    error: !state.identifier.value ? "Username or email is required" : "",
                },
                password: {
                    ...state.password,
                    touched: true,
                    error: !state.password.value ? "Password is required" : "",
                },
            }

            const hasAllValues = updatedState.identifier.value && updatedState.password.value

            const hasNoErrors = !updatedState.identifier.error && !updatedState.password.error

            return {
                ...updatedState,
                formIsValid: hasAllValues && hasNoErrors,
            }
        }
        default:
            return state
    }
}

const LoginPage = () => {
    const navigate = useNavigate()
    const [state, formDispatch] = useReducer(formReducer, initialState)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const dispatch = useDispatch()
    const { state: routerState } = useLocation()
    const isLogout = routerState?.logout || false
    const isPasswordReset = routerState?.resetPassword || false

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const result = await axios.post(
                `${BASE_URL}/api/auth/login`,
                {
                    usernameOrEmail: state.identifier.value,
                    password: state.password.value,
                },
                { withCredentials: true },
            )
            dispatch(setCredentials({ token: result.data.token, userData: result.data.userData }))
            localStorage.setItem("isLoggedIn", "true")
            return navigate("/", { replace: true })
        } catch (err) {
            const message = err?.response
                ? err?.response?.data
                : "Something failed. Please try again later."

            formDispatch({
                type: "SET_FORM_ERROR",
                error: err?.response?.data || "Failed to log in",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        if (isLogout) {
            dispatch(setCredentials({ token: null, userData: null }))
            localStorage.removeItem("isLoggedIn")
        }
    }, [isLogout])

    return (
        <div className='auth-shell'>
            <div className='auth-card'>
                <h2 className='auth-title'>Welcome Back</h2>
                <p className='auth-subtitle'>Sign in to continue to LifeMax.</p>
                <form
                    onSubmit={handleSubmit}
                    style={styles.form}
                >
                    <Input
                        type='text'
                        name='identifier'
                        value={state.identifier.value}
                        onChange={(e) =>
                            formDispatch({
                                type: "SET_FIELD",
                                field: "identifier",
                                value: e.target.value,
                            })
                        }
                        error={state.identifier.error}
                        placeholder='Username or Email'
                    />
                    <Input
                        type='password'
                        name='password'
                        value={state.password.value}
                        onChange={(e) =>
                            formDispatch({
                                type: "SET_FIELD",
                                field: "password",
                                value: e.target.value,
                            })
                        }
                        error={state.password.error}
                        placeholder='Password'
                    />
                    <div style={styles.buttonContainer}>
                        <Button
                            onClick={handleSubmit}
                            disabled={!state.formIsValid || isSubmitting}
                        >
                            Log In
                        </Button>
                        {state.formError && <div style={styles.error}>{state.formError}</div>}
                        {isPasswordReset && (
                            <div style={styles.success}>
                                Password reset successfully! Please log in.
                            </div>
                        )}
                    </div>
                </form>
                <p style={styles.signupText}>
                    Don't have an account?{" "}
                    <Link
                        to='/signup'
                        style={styles.link}
                    >
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    )
}

const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        backgroundColor: "#000",
    },
    formContainer: {
        backgroundColor: "#111",
        padding: "2rem",
        borderRadius: "8px",
        width: "100%",
        maxWidth: "400px",
        border: "1px solid #333",
    },
    title: {
        color: "#fff",
        textAlign: "center",
        marginBottom: "2rem",
        fontSize: "1.5rem",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
    },
    buttonContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginTop: "0.5rem",
    },
    error: {
        color: "#ff4444",
        textAlign: "center",
        fontSize: "0.9rem",
        padding: "0.5rem",
        backgroundColor: "rgba(255, 68, 68, 0.1)",
        borderRadius: "4px",
        width: "100%",
    },
    success: {
        color: "#4BB543",
        textAlign: "center",
        fontSize: "0.9rem",
        padding: "0.5rem",
        backgroundColor: "rgba(75, 181, 67, 0.1)",
        borderRadius: "4px",
        width: "100%",
        marginTop: "0.5rem",
    },
    signupText: {
        color: "#999",
        textAlign: "center",
        marginTop: "1.5rem",
        fontSize: "0.9rem",
    },
    link: {
        color: "#ff4444",
        textDecoration: "none",
    },
}

export default LoginPage
