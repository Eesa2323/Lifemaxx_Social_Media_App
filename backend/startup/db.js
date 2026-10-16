const mongoose = require("mongoose")
const config = require("config")
const url = config.get("DBURL")

module.exports = async () => {
    try {
        await mongoose.connect(url, { family: 4 })
    } catch (err) {
        console.error(err)
    } finally {
        console.log("Database started")
    }
}
