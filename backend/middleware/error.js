module.exports = function (err, _, res, _) {
    const statusCode = err.status ?? 500
    console.log("Error: " + err)

    const message = "Something failed. Please try again later."
    return res.status(statusCode).send(message)
}
