const nodemailer = require("nodemailer")
const config = require("config")

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: config.get("GMAIL_EMAIL"),
        pass: config.get("GMAIL_PASSWORD"),
    },
})

module.exports = transporter
