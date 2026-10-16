import { useMediaQuery } from "@mui/material"
import React, { useRef, useState } from "react"
import Input from "../components/Input"
import SubmitButton from "../components/Button"
import { BASE_URL } from "../utils/config"
import axios from "axios"
import { useLocation, useNavigate } from "react-router-dom"

const styles = {
    containerBase: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        borderRadius: "8px",
        minHeight: "500px",
        padding: "24px",
        boxSizing: "border-box",
    },
    header: {
        fontSize: "24px",
        margin: 0,
        marginBottom: "12px",
    },
    subtext: {
        fontSize: "14px",
        color: "#666",
        textAlign: "center",
        margin: 0,
        marginBottom: "24px",
    },
    inputWrapper: {
        width: "100%",
    },
    input: {
        width: "100%",
    },
    buttonWrapper: {
        width: "100%",
    },
    button: {
        width: "100%",
        height: "42px",
        marginTop: -20,
    },
}

export function ResetPassword() {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const { state } = useLocation()
    const { email, token } = state || {}
    const [error, setError] = useState(null)

    const handleReset = async (password, password2) => {
        console.log("called1343")

        if (isLoading || !password || !password2 || password !== password2) return

        try {
            setIsLoading(true)

            await axios.post(`${BASE_URL}/api/users/reset-password`, {
                token,
                email,
                newPassword: password,
            })

            return navigate("/login", {
                replace: true,
                state: { resetPassword: true },
            })
        } catch (err) {
            const message = err?.response?.data ?? "Something failed. Please try again later."
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    return email && token ? (
        <GenericResetForm
            type={"reset"}
            submitFn={handleReset}
            isLoading={isLoading}
            error={error}
        />
    ) : (
        <div>Error, 403.</div>
    )
}

export const ResetPasswordRequest = () => {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleResetRequest = async (email) => {
        if (!email || isLoading) return

        try {
            setIsLoading(true)

            await axios.post(`${BASE_URL}/api/users/request-reset-password`, {
                email,
            })

            return navigate("/reset-password/verify", { state: { email }, replace: true })
        } catch (err) {
            const message = err?.response?.data ?? "Something failed. Please try again later."
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <GenericResetForm
            type={"request"}
            submitFn={handleResetRequest}
            isLoading={isLoading}
            error={error}
        />
    )
}

export const ResetPasswordVerify = () => {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const { state } = useLocation()
    const { email } = state || {}
    const [error, setError] = useState(null)

    const handleResetVerify = async (code) => {
        if (!code || isLoading) return

        try {
            setIsLoading(true)

            const response = await axios.post(`${BASE_URL}/api/users/verify_reset_token`, {
                token: code,
                email,
            })

            const token = response.data
            return navigate("/reset-password/reset", { state: { email, token }, replace: true })
        } catch (err) {
            const message = err?.response?.data ?? "Something failed. Please try again later."
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    return email ? (
        <GenericResetForm
            type={"verify"}
            submitFn={handleResetVerify}
            isLoading={isLoading}
            error={error}
        />
    ) : (
        <div>Error, 403.</div>
    )
}

const GenericResetForm = ({ type, submitFn, error, isLoading }) => {
    const isMobile = useMediaQuery("(max-width:600px)")
    const containerStyle = {
        ...styles.containerBase,
        width: isMobile ? "100%" : "600px",
        margin: isMobile ? "16px 0 0" : "32px auto 0",
        border: !isMobile && "1px solid var(--lightGrey)",
    }
    const emailRef = useRef("")
    const codeRef = useRef("")
    const passwordRef = useRef("")
    const password2Ref = useRef("")
    const [inputValues, setInputValues] = useState({
        email: "",
        code: "",
        password: "",
        password2: "",
    })
    const subheading =
        type === "request"
            ? "Enter your email to receive a password reset link."
            : type === "verify"
              ? "Please enter the code sent to your email"
              : "Please enter your new password"

    // Track input values for validation
    const handleInputChange = (inputType, value) => {
        setInputValues((prev) => ({
            ...prev,
            [inputType]: value,
        }))
    }

    // Validate inputs based on form type
    const isButtonDisabled = () => {
        if (isLoading) return true

        if (type === "request") {
            return !inputValues.email
        } else if (type === "verify") {
            return !inputValues.code || inputValues.code.length < 6
        } else if (type === "reset") {
            return (
                !inputValues.password ||
                inputValues.password.length < 6 ||
                !inputValues.password2 ||
                inputValues.password !== inputValues.password2
            )
        }
        return false
    }

    const handleClick = () => {
        console.log("dkode")

        const email = emailRef.current.value
        const code = codeRef.current.value
        const password = passwordRef.current.value
        const password2 = password2Ref.current.value

        // Basic validation before submitting
        if (type === "request" && !email) {
            return // Don't submit if email is empty
        } else if (type === "verify" && (!code || code.length < 6)) {
            return // Don't submit if code is empty or less than 6 chars
        } else if (type === "reset") {
            if (!password || !password2 || password.length < 6) {
                return // Don't submit if either password field is empty or password is too short
            }
            if (password !== password2) {
                return // Don't submit if passwords don't match
            }
        }

        const params =
            type === "request" ? [email] : type === "verify" ? [code] : [password, password2]

        submitFn(...params)
    }

    return (
        <div
            className='auth-card'
            style={{ ...containerStyle, padding: "2rem" }}
        >
            <h2 className='auth-title'>Reset Password</h2>
            <p className='auth-subtitle'>{subheading}</p>
            <div style={styles.inputWrapper}>
                <Input
                    theRef={
                        type === "request" ? emailRef : type === "verify" ? codeRef : passwordRef
                    }
                    placeholder={
                        type === "request"
                            ? "Enter your email"
                            : type === "verify"
                              ? "Enter code"
                              : "New Password"
                    }
                    style={styles.input}
                    onChange={(e) => {
                        const inputType =
                            type === "request" ? "email" : type === "verify" ? "code" : "password"
                        handleInputChange(inputType, e.target.value)
                    }}
                />

                {type === "reset" && (
                    <Input
                        theRef={password2Ref}
                        placeholder='Confirm New Password'
                        style={styles.input}
                        onChange={(e) => handleInputChange("password2", e.target.value)}
                    />
                )}
            </div>
            <div style={styles.buttonWrapper}>
                <SubmitButton
                    onClick={handleClick}
                    disabled={isButtonDisabled()}
                    style={styles.button}
                >
                    {type === "request"
                        ? "Send Reset Link"
                        : type === "verify"
                          ? "Verify Code"
                          : "Reset Password"}
                </SubmitButton>
            </div>

            {error && <p style={{ color: "#ff4444", marginTop: 14, fontSize: 13 }}>{error}</p>}
        </div>
    )
}

export default ResetPassword
