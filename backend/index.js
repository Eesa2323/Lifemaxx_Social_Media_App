require("dotenv").config()
const express = require("express")
const app = express()
const config = require("config")
const { Rest } = require("ably")

const PORT = config.get("PORT")
app.listen(PORT, () => console.log(`Listening on port: ${PORT}`))

require("./startup/db")()
require("./startup/middleware")(app)
require("./startup/ably")(app)
