import validate from "validate.js"

export const validateAuthInput = (inputId, value, authType) => {
    if (inputId === "username") {
        return validateUsername(value)
    }

    if (inputId === "bio") {
        return validateBio(value)
    }

    if (inputId === "usernameOrEmail") {
        return validateString(value, inputId)
    }

    if (inputId === "email") {
        return validateEmail(value)
    }

    if (inputId === "password") {
        if (authType && authType === "login") return validateString(value, inputId)
        else return validatePassword(value)
    }

    if (inputId === "confirmPassword") {
        return validatePassword2(value)
    }
}

const validateUsername = (value) => {
    const constraints = {
        username: {
            type: "string",
            length: {
                minimum: 4,
                maximum: 30,
                tooShort: "must be 4 characters long",
                tooLong: "cannot exceed 30 characters",
            },
            format: {
                pattern: /^(?:[\p{L}\p{N}_]+\.?)*[\p{L}][\p{L}\p{N}_]*$/u,
                message: "is not valid",
            },
        },
    }

    return validate({ username: value }, constraints)
}

const validateBio = (value) => {
    console.log(value)

    const constraints = {
        bio: {
            type: "string",
            length: {
                maximum: 1000,
                tooLong: "cannot exceed 1000 characters",
            },
            format: {
                pattern: /^(?!\s+$).*$/u,
                message: "is not valid",
            },
        },
    }

    return validate({ bio: value }, constraints)
}

const validateEmail = (value) => {
    let constraints = {
        email: {
            type: "string",
            presence: true,
            length: {
                minimum: 10,
            },
            email: {
                message: "address is not valid",
            },
        },
    }

    return validate({ email: value }, constraints)
}

const validatePassword = (value) => {
    const constraints = {
        password: {
            type: "string",
            length: {
                minimum: 6,
                maximum: 1000,
                tooShort: "must be 6 characters long",
                tooLong: "cannot exceed 1000 characters",
            },
            format: {
                pattern: /^[^\s]+$/,
                message: "cannot contain spaces",
            },
        },
    }

    return validate({ password: value }, constraints)
}

const validatePassword2 = (value) => {
    const constraints = {
        confirmPassword: {
            type: "string",
            length: {
                minimum: 1,
                tooShort: "is required",
            },
        },
    }

    return validate({ confirmPassword: value }, constraints)
}

const validateString = (value, id) => {
    const constraints = {
        [id]: {
            type: "string",
            presence: true,
            length: {
                minimum: 1,
                tooShort: "is required",
            },
        },
    }

    return validate({ [id]: value }, constraints)
}
