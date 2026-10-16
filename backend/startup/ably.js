const { Rest } = require("ably")
const config = require("config")

module.exports = function (app) {
    const ablyRest = new Rest({
        key: config.get("ABLY_API_KEY"),
    })
    app.set("ablyRest", ablyRest)
}
