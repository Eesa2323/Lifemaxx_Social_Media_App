const test = require("node:test")
const assert = require("node:assert/strict")
const mongoose = require("mongoose")
const { Community } = require("../models/Community")
const { validateCommunityCreation } = require("../middleware/validation")

test("Other is accepted by the creation middleware and community model", () => {
    const body = { name: "Other group", description: "A description", category: "Other" }
    let accepted = false
    validateCommunityCreation({ body }, { status: () => { throw new Error("Rejected") } }, () => {
        accepted = true
    })
    assert.equal(accepted, true)
    const community = new Community({ ...body, creator: new mongoose.Types.ObjectId() })
    assert.equal(community.validateSync(), undefined)
})

test("unknown categories remain invalid", () => {
    let status
    let response
    validateCommunityCreation(
        { body: { name: "Group", description: "Description", category: "Unknown" } },
        { status: (code) => { status = code; return { send: (data) => { response = data } } } },
        () => { throw new Error("Unexpectedly accepted") }
    )
    assert.equal(status, 400)
    assert.match(response.error, /category/)
})
