export const validateEmail = (email) => {
    if (!email) return "Email is required"
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return "Invalid email format"
    return ""
}

export const validatePassword = (password) => {
    if (!password) return "Password is required"
    if (password.length < 6) return "Password must be at least 6 characters"
    return ""
}

export const validateDisplayName = (displayName) => {
    if (!displayName) return "Display name is required"
    if (displayName.length < 2) return "Display name must be at least 2 characters"
    return ""
}

export const validateUsername = (username) => {
    // Handle empty username first
    if (!username || username.trim() === "") {
        return {
            isValid: false,
            error: "Username is required",
        }
    }

    // Check minimum length
    if (username.length < 6) {
        return {
            isValid: false,
            error: "Username must be at least 6 characters",
        }
    }

    // Check maximum length
    if (username.length > 200) {
        return {
            isValid: false,
            error: "Username must be 200 characters or less",
        }
    }

    // Check for allowed characters (letters, numbers, underscore, hyphen)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(username)) {
        return {
            isValid: false,
            error: "Username can only contain letters, numbers, underscore (_) and hyphen (-)",
        }
    }

    // If all checks pass
    return {
        isValid: true,
        error: "",
    }
}

export const validateForm = (state) => {
    const emailError = validateEmail(state.email)
    const passwordError = validatePassword(state.password)
    const displayNameError = validateDisplayName(state.displayName)
    const usernameValidation = validateUsername(state.username)

    return {
        emailError,
        passwordError,
        displayNameError,
        usernameError: usernameValidation.error,
        isValid: !emailError && !passwordError && !displayNameError && usernameValidation.isValid,
    }
}
