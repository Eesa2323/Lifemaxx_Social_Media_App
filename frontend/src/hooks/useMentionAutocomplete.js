import { useState, useRef, useCallback } from "react"

const useMentionAutocomplete = (onChangeCallback, externalInputRef) => {
    const [showMentionPopup, setShowMentionPopup] = useState(false)
    const [mentionSearchTerm, setMentionSearchTerm] = useState("")
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
    const internalInputRef = useRef(null)

    // Use external ref if provided, otherwise use internal ref
    const inputRef = externalInputRef || internalInputRef

    const handleInputChange = useCallback(
        (value, event) => {
            const input = event?.target || inputRef.current
            if (!input) return value

            const cursorPosition = input.selectionStart || 0
            const textBeforeCursor = value.substring(0, cursorPosition)

            // Check if we're in a mention context (@username)
            const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

            if (mentionMatch) {
                const searchTerm = mentionMatch[1]
                setMentionSearchTerm(searchTerm)
                setShowMentionPopup(true)

                // Calculate position for popup relative to the input element
                const textBeforeMention = textBeforeCursor.substring(0, mentionMatch.index)

                // Create a temporary span to measure text width
                const tempSpan = document.createElement("span")
                tempSpan.style.font = window.getComputedStyle(input).font
                tempSpan.style.visibility = "hidden"
                tempSpan.style.position = "absolute"
                tempSpan.style.whiteSpace = "pre"
                tempSpan.textContent = textBeforeMention
                document.body.appendChild(tempSpan)

                const textWidth = tempSpan.offsetWidth
                document.body.removeChild(tempSpan)

                // Get input padding
                const computedStyle = window.getComputedStyle(input)
                const paddingLeft = parseInt(computedStyle.paddingLeft)

                // Position horizontally aligned with the @ symbol
                // Position vertically at the top of the input (popup will be positioned above this)
                const isTextarea = input.tagName.toLowerCase() === "textarea"

                // Calculate current line for textareas
                const currentLine = isTextarea ? textBeforeCursor.split("\n").length - 1 : 0

                // Get scroll position for textareas
                const scrollTop = isTextarea ? input.scrollTop : 0

                setMentionPosition({
                    top: 0, // Top of the input element
                    left: textWidth + paddingLeft,
                    isTextarea, // Pass this info to adjust positioning
                    currentLine, // Pass current line for modal positioning
                    scrollTop, // Pass scroll position for modal positioning
                })
            } else {
                setShowMentionPopup(false)
                setMentionSearchTerm("")
            }

            return value
        },
        [inputRef]
    )

    const handleMentionSelect = useCallback(
        (username) => {
            const input = inputRef.current
            if (!input) return

            const cursorPosition = input.selectionStart || 0
            const value = input.value
            const textBeforeCursor = value.substring(0, cursorPosition)

            // Find the start of the current mention
            const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
            if (!mentionMatch) return

            const mentionStart = mentionMatch.index
            const textAfterCursor = value.substring(cursorPosition)

            // Replace the mention with the selected username
            const newValue =
                value.substring(0, mentionStart) + "@" + username + " " + textAfterCursor

            // Call the onChange callback to update React state
            if (onChangeCallback) {
                onChangeCallback(newValue)
            }

            // Set cursor position after the inserted username
            const newCursorPosition = mentionStart + username.length + 2 // +2 for @ and space
            input.setSelectionRange(newCursorPosition, newCursorPosition)

            setShowMentionPopup(false)
            setMentionSearchTerm("")
        },
        [onChangeCallback, inputRef]
    )

    const closeMentionPopup = useCallback(() => {
        setShowMentionPopup(false)
        setMentionSearchTerm("")
    }, [])

    return {
        showMentionPopup,
        mentionSearchTerm,
        mentionPosition,
        inputRef,
        handleInputChange,
        handleMentionSelect,
        closeMentionPopup,
    }
}

export default useMentionAutocomplete
