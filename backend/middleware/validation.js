const Joi = require("joi")
const {
    ACCEPTED_CATEGORIES: ACCEPTED_COMMUNITY_CATGEGORIES,
} = require("../models/Community")
const ACCEPTED_CATEGORIES = ACCEPTED_COMMUNITY_CATGEGORIES.filter((category) => category !== "Other")

function validateUserSignup(user) {
    const schema = Joi.object({
        username: Joi.string()
            .min(4)
            .max(30)
            .required()
            .regex(new RegExp(/^(?:[\p{L}\p{N}_]+\.?)*[\p{L}][\p{L}\p{N}_]*$/u)),

        email: Joi.string().min(3).max(255).required().email(),
        password: Joi.string().min(6).max(1000).required().pattern(/^\S+$/),
        profilePic: Joi.string().uri().optional().allow(null, ""),
        bio: Joi.string().max(250).optional().allow(null, ""),
        location: Joi.string().max(300).optional().allow(null, ""),
        interests: Joi.array()
            .items(Joi.string().valid("Fitness", "Money", "Self-Improvement", "Looksmaxxing"))
            .min(1)
            .max(5)
            .required(),
    }).error((errors) => {
        errors.forEach((err) => {
            if (err.code === "string.email") err.message = "Email address is not valid"
        })
        return errors
    })

    return schema.validate(user)
}

const validateJourneyCreation = (req, res, next) => {
    const file = req.files && req.files.file
    const { title, description, tags } = req.body
    const acceptedMimetypes = ["image/png", "image/jpeg"]

    try {
        // Validate file if provided
        if (file && !acceptedMimetypes.includes(file.mimetype))
            throw new Error("Invalid file type for thumbnail. Only PNG and JPEG are allowed.")

        // Validate title has at least one non-space character
        if (!title || !title.trim()) throw new Error("Title cannot be empty or contain only spaces")

        // Validate description has at least one non-space character if provided
        if (description !== undefined && description !== null && !description.trim())
            throw new Error("Description cannot be empty or contain only spaces")

        // Validate tags if provided
        if (tags) {
            let parsedTags
            try {
                parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags
            } catch (e) {
                throw new Error("Tags must be a valid JSON array")
            }

            // Ensure tags is an array with at least one item
            if (!Array.isArray(parsedTags) || parsedTags.length < 1)
                throw new Error("At least one category must be selected")

            // Validate all tags are in accepted categories
            const invalidTags = parsedTags.filter((tag) => !ACCEPTED_CATEGORIES.includes(tag))
            if (invalidTags.length > 0)
                throw new Error(`Invalid categories: ${invalidTags.join(", ")}`)

            // Store parsed tags back in req.body
            req.body.tags = parsedTags
        } else {
            throw new Error("Tags are required")
        }

        next()
    } catch (err) {
        return res.status(400).send(err.message)
    }
}

const validateMessageCreation = (req, res, next) => {
    const file = req.files && req.files.file
    const { messageText, reply } = req.body
    const acceptedMimetypes = ["image/png", "image/jpeg", "image/gif", "video/mp4"]

    try {
        if (!file && !messageText) throw new Error("Message or file required")
        else if (file && !acceptedMimetypes.includes(file.mimetype))
            throw new Error("Invalid mimetype")

        if (messageText) Joi.attempt(messageText, Joi.string().min(1).max(1000))
        if (reply) Joi.attempt(reply, Joi.string())

        next()
    } catch (err) {
        const message = err.name === "ValidationError" ? "Message is not valid" : err.message
        return res.status(400).send(message)
    }
}

function validateUserLogin(user) {
    const schema = Joi.object({
        usernameOrEmail: Joi.string().min(1).max(500).required(),
        password: Joi.string().min(1).max(1000).required(),
    })

    return schema.validate(user)
}

function validatePostCreation(req, res, next) {
    const file = req.files && req.files.file
    console.log(file)

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4"]
    const schema = Joi.object({
        journeyid: Joi.string().min(1).max(5000),
        caption: Joi.string().max(5000),
    })

    try {
        if (file && !allowedTypes.includes(file.mimetype))
            throw new Error("Invalid file for the post")

        const { error } = schema.validate(req.body, { abortEarly: true })
        if (error) return res.status(400).send({ error: error.details[0].message })

        next()
    } catch (err) {
        const message = err.name === "ValidationError" ? "Invalid fields provided" : err.message
        return res.status(400).send(message)
    }
}

const validateEmail = (req, res, next) => {
    const schema = Joi.object({ email: Joi.string().min(3).max(255).required().email() })

    const { error } = schema.validate(req.body)
    if (error) return res.status(400).send({ error: error.details[0].message })

    next()
}

const validateEditChatDetails = (req, res, next) => {
    const chatPicture = req.files && req.files.file
    const chatId = req.params.chatid
    const chatTitle = req.body?.chatTitle
    const acceptedProfilePicMimetypes = ["image/png", "image/jpeg"]

    try {
        if (!chatId) throw new Error("No chat id.")
        else if ((chatPicture && chatTitle) || (!chatPicture && !chatTitle))
            throw new Error("Must update one property only")
        else if (chatPicture && !acceptedProfilePicMimetypes.includes(chatPicture.mimetype))
            throw new Error("Invalid profile picture mimetype")
        else if (chatTitle) Joi.attempt(chatTitle, Joi.string().min(1).max(100))

        next()
    } catch (err) {
        const message = err.name === "ValidationError" ? "Chat name is not valid" : err.message
        return res.status(400).send(message)
    }
}

const validateUpdateUserDetails = (req, res, next) => {
    const file = req.files && req.files.file
    const { username, bio, location, interests } = req.body || {}
    try {
        if (username) Joi.attempt(username, Joi.string().min(4).max(1000))
        if (bio) Joi.attempt(bio, Joi.string().min(1))
        if (location) Joi.attempt(location, Joi.string().min(1))
        if (interests) {
            const parsedInterests = JSON.parse(interests)
            Joi.attempt(
                parsedInterests,
                Joi.array()
                    .items(
                        Joi.string().valid("Fitness", "Money", "Self-Improvement", "Looksmaxxing")
                    )
                    .min(1)
                    .max(5)
            )
            req.updatePayload = { username, bio, location, interests: parsedInterests }
        } else {
            req.updatePayload = { username, bio, location }
        }
        next()
    } catch (err) {
        console.log(err)

        const message = err.name === "ValidationError" ? "Invalid fields provided" : err.message
        return res.status(400).send(message)
    }
}

const validateCommunityCreation = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().min(1).required().trim(),
        description: Joi.string().min(1).required().trim(),
        category: Joi.string().valid(...ACCEPTED_COMMUNITY_CATGEGORIES),
    })

    const { error } = schema.validate(req.body, { abortEarly: true })
    if (error) return res.status(400).send({ error: error.details[0].message })

    next()
}

const validateStartupCreation = (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string().min(1).required().trim(),
        description: Joi.string().min(1).required().trim(),
        keywords: Joi.array()
            .items(
                Joi.string()
                    .trim()
                    .max(15)
                    .error((errors) => {
                        errors.forEach((err) => {
                            if (err.code === "string.max") {
                                err.message = "Keywords must be 15 characters or less"
                            }
                        })
                        return errors
                    })
            )
            .max(5)
            .unique()
            .optional(),
    })

    const { error } = schema.validate(req.body, { abortEarly: true })
    if (error) return res.status(400).send({ error: error.details[0].message })

    next()
}

const validatePasswordChange = (req, res, next) => {
    const schema = Joi.object({
        currentPassword: Joi.string().min(6).max(1000).required(),
        newPassword: Joi.string().min(6).max(1000).required().pattern(/^\S+$/),
    })

    const { error } = schema.validate(req.body)
    if (error) return res.status(400).send({ error: error.details[0].message })

    next()
}

module.exports = {
    validateUserLogin,
    validatePasswordChange,
    validateEmail,
    validateUserSignup,
    validateUpdateUserDetails,
    validateCommunityCreation,
    validatePostCreation,
    validateMessageCreation,
    validateEditChatDetails,
    validateStartupCreation,
    validateJourneyCreation,
}
