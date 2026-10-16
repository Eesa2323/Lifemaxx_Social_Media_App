import React, { useReducer, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { validateForm } from "../utils/validation"
import axios from "axios"
import Input from "../components/Input"
import Button from "../components/Button"
import { BASE_URL } from "../utils/config"
import { useDispatch } from "react-redux"
import { setCredentials } from "../store/authSlice"
import ProfilePic from "../components/ProfilePic"
import LocationSelector from "../components/LocationSelector"

const initialState = {
    username: {
        value: "",
        error: "",
        touched: false,
    },
    email: {
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
            const validation = validateForm({
                username: newState.username.value,
                email: newState.email.value,
                password: newState.password.value,
            })

            const updatedState = {
                ...newState,
                username: {
                    ...newState.username,
                    error: newState.username.touched ? validation.usernameError : "",
                },
                email: {
                    ...newState.email,
                    error: newState.email.touched ? validation.emailError : "",
                },
                password: {
                    ...newState.password,
                    error: newState.password.touched ? validation.passwordError : "",
                },
            }

            // Check if all fields have values and no errors
            const hasAllValues =
                updatedState.username.value &&
                updatedState.email.value &&
                updatedState.password.value

            const hasNoErrors =
                !updatedState.username.error &&
                !updatedState.email.error &&
                !updatedState.password.error

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
            const validation = validateForm({
                username: state.username.value,
                email: state.email.value,
                password: state.password.value,
            })

            const updatedState = {
                ...state,
                username: {
                    ...state.username,
                    error: validation.usernameError,
                    touched: true,
                },
                email: {
                    ...state.email,
                    error: validation.emailError,
                    touched: true,
                },
                password: {
                    ...state.password,
                    error: validation.passwordError,
                    touched: true,
                },
            }

            // Check if all fields have values and no errors
            const hasAllValues =
                updatedState.username.value &&
                updatedState.email.value &&
                updatedState.password.value

            const hasNoErrors =
                !validation.usernameError && !validation.emailError && !validation.passwordError

            return {
                ...updatedState,
                formIsValid: hasAllValues && hasNoErrors,
            }
        }
        default:
            return state
    }
}

const CATEGORIES = [
    { id: "Fitness", title: "Fitness", icon: "💪" },
    { id: "Money", title: "Money", icon: "💼" },
    { id: "Self-Improvement", title: "Self-Improvement", icon: "🎯" },
    { id: "Looksmaxxing", title: "Looksmaxxing", icon: "✨" },
]

const SignupPage = () => {
    const navigate = useNavigate()
    const [state, formDispatch] = useReducer(formReducer, initialState)
    const dispatch = useDispatch()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState(1)
    // Step 2 fields
    const [profilePreview, setProfilePreview] = useState(null)
    const [profileFile, setProfileFile] = useState(null)
    const [bio, setBio] = useState("")
    const [city, setCity] = useState("")
    const [step2Error, setStep2Error] = useState("")
    const [selectedCategories, setSelectedCategories] = useState([])

    // Step 1: check username/email availability
    const handleStep1 = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        formDispatch({ type: "VALIDATE_ALL" })
        if (!state.formIsValid) {
            setIsSubmitting(false)
            return
        }
        try {
            // Check username/email availability (simulate API call)
            await axios.post(`${BASE_URL}/api/auth/check-availability`, {
                username: state.username.value,
                email: state.email.value,
            })
            setStep(2)
            setStep2Error("")
        } catch (err) {
            formDispatch({
                type: "SET_FORM_ERROR",
                error:
                    err?.response?.data?.error ||
                    err?.response?.data ||
                    "Username or email not available",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCategoryToggle = (cat) => {
        setSelectedCategories((prev) =>
            prev.includes(cat)
                ? prev.filter((c) => c !== cat)
                : prev.length < 5
                  ? [...prev, cat]
                  : prev,
        )
    }

    // Step 2: complete profile and signup
    const handleStep2 = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        setStep2Error("")
        if (!city) {
            setStep2Error("Location is required.")
            setIsSubmitting(false)
            return
        }
        if (selectedCategories.length === 0) {
            setStep2Error("Please select at least one interest.")
            setIsSubmitting(false)
            return
        }
        try {
            // Create FormData for file upload
            const formData = new FormData()
            formData.append("username", state.username.value)
            formData.append("email", state.email.value)
            formData.append("password", state.password.value)
            formData.append("bio", bio)
            formData.append("location", city)
            selectedCategories.forEach((cat) => formData.append("interests", cat))
            if (profileFile) {
                formData.append("profilePic", profileFile)
            }
            const result = await axios.post(`${BASE_URL}/api/auth/signup`, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
            })
            const token = result?.headers["x-auth-token"]
            dispatch(setCredentials({ token, userData: result.data }))
            return navigate("/", { state: { isNewSignup: true }, replace: true })
        } catch (err) {
            setStep2Error(
                err?.response?.data?.error ||
                    err?.response?.data ||
                    "Failed to create account. Please try again.",
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className='auth-shell'>
            <div className='auth-card'>
                <h2 className='auth-title'>Create Account</h2>
                <p className='auth-subtitle'>Build your profile and join the LifeMax community.</p>
                {step === 1 && (
                    <form
                        onSubmit={handleStep1}
                        style={styles.form}
                    >
                        <Input
                            type='text'
                            name='username'
                            value={state.username.value}
                            onChange={(e) =>
                                formDispatch({
                                    type: "SET_FIELD",
                                    field: "username",
                                    value: e.target.value,
                                })
                            }
                            error={state.username.error}
                            placeholder='Username'
                        />
                        <Input
                            type='email'
                            name='email'
                            value={state.email.value}
                            onChange={(e) =>
                                formDispatch({
                                    type: "SET_FIELD",
                                    field: "email",
                                    value: e.target.value,
                                })
                            }
                            error={state.email.error}
                            placeholder='Email'
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
                                onClick={handleStep1}
                                disabled={!state.formIsValid || isSubmitting}
                            >
                                Next
                            </Button>
                            {state.formError && <div style={styles.error}>{state.formError}</div>}
                        </div>
                    </form>
                )}
                {step === 2 && (
                    <form
                        onSubmit={handleStep2}
                        style={styles.form}
                    >
                        <div
                            style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}
                        >
                            <ProfilePic
                                size={80}
                                src={profilePreview ?? null}
                                editText={"Select Avatar"}
                                hasEdit={true}
                                onChange={(file) => {
                                    setProfilePreview(URL.createObjectURL(file))
                                    setProfileFile(file)
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: 16, width: "100%" }}>
                            <label style={{ color: "#ccc", marginBottom: 4, display: "block" }}>
                                Location <span style={{ color: "#ff4444" }}>*</span>
                            </label>
                            <LocationSelector
                                style={{ width: "100%" }}
                                onSelect={setCity}
                            />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: "#ccc", marginBottom: 4, display: "block" }}>
                                Bio
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder='Tell us about yourself'
                                style={{
                                    width: "100%",
                                    minHeight: 80,
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid #444",
                                    backgroundColor: "#333",
                                    color: "#eee",
                                    resize: "vertical",
                                }}
                            />
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                marginBottom: 16,
                                width: "100%",
                            }}
                        >
                            <label style={{ fontWeight: 500, marginBottom: 4 }}>
                                Interests <span style={{ color: "#ff4444" }}>*</span>
                            </label>
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 12,
                                    width: "100%",
                                }}
                            >
                                {CATEGORIES.map((cat) => (
                                    <div
                                        key={cat.id}
                                        onClick={() => handleCategoryToggle(cat.id)}
                                        style={{
                                            padding: "10px 18px",
                                            borderRadius: 8,
                                            border: selectedCategories.includes(cat.id)
                                                ? "2px solid #ff4444"
                                                : "1px solid #333",
                                            background: selectedCategories.includes(cat.id)
                                                ? "#2a1a1a"
                                                : "#181818",
                                            color: selectedCategories.includes(cat.id)
                                                ? "#ff4444"
                                                : "white",
                                            fontWeight: 500,
                                            fontSize: 16,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            transition: "all 0.2s",
                                            minWidth: 140,
                                            justifyContent: "center",
                                        }}
                                    >
                                        <span>{cat.icon}</span> {cat.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {selectedCategories.length > 0 && (
                            <div
                                style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
                            >
                                {selectedCategories.map((cat) => (
                                    <span
                                        key={cat}
                                        style={{
                                            background: "#ff4444",
                                            color: "white",
                                            borderRadius: 16,
                                            padding: "4px 14px",
                                            fontSize: 14,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div style={styles.buttonContainer}>
                            <Button
                                onClick={handleStep2}
                                disabled={isSubmitting}
                            >
                                Finish
                            </Button>
                            {step2Error && <div style={styles.error}>{step2Error}</div>}
                        </div>
                    </form>
                )}
                <p style={styles.loginText}>
                    Already have an account?{" "}
                    <Link
                        to='/login'
                        style={styles.link}
                    >
                        Log In
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
    loginText: {
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

export default SignupPage
