const { Rest } = require("ably")

module.exports = function (app) {
    const ablyRest = new Rest({
        key: "4sRwYg.WLqbXg:uYqTc1moWbTzzLY73kTMFw4ipBKdNW7Ihwi7ONqYFKw",
    })
    app.set("ablyRest", ablyRest)
}
