import React, { useState, useEffect, useRef } from "react"

export default function LocationSelector({ onSelect, style = {}, initialValue = "" }) {
    const [input, setInput] = useState(initialValue)
    const [suggestions, setSuggestions] = useState([])
    const ctrlRef = useRef(null)
    const containerRef = useRef(null)

    useEffect(() => {
        const handleClickAway = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setSuggestions([])
            }
        }

        document.addEventListener("mousedown", handleClickAway)
        return () => {
            document.removeEventListener("mousedown", handleClickAway)
        }
    }, [])
    useEffect(() => {
        if (ctrlRef.current) ctrlRef.current.abort()
        if (input.length < 2) {
            setSuggestions([])
            return
        }
        const controller = new AbortController()
        ctrlRef.current = controller

        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    name_startsWith: input,
                    featureClass: "P",
                    maxRows: "5",
                    username: "eesa",
                })
                const res = await fetch(`http://api.geonames.org/searchJSON?${params}`, {
                    signal: controller.signal,
                })
                const data = await res.json()
                setSuggestions(data.geonames.map((g) => `${g.name}, ${g.countryName}`))
            } catch (err) {
                if (err.name !== "AbortError") console.error(err)
            }
        }, 300)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [input])

    return (
        <div style={{ position: "relative", width: 300, ...style }}>
            <div
                ref={containerRef}
                style={{ position: "relative", width: "100%" }}
            >
                <input
                    style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 4,
                        border: "1px solid #444",
                        backgroundColor: "#333",
                        color: "#eee",
                    }}
                    placeholder='Type a city...'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                {suggestions.length > 0 && (
                    <ul
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#333",
                            maxHeight: 200,
                            overflowY: "auto",
                            margin: 0,
                            padding: 0,
                            listStyle: "none",
                            border: "1px solid #444",
                            borderRadius: "0 0 4px 4px",
                            zIndex: 10,
                        }}
                    >
                        {suggestions.map((city, i) => (
                            <li
                                key={i}
                                onClick={() => {
                                    setInput(city)
                                    onSelect(city)
                                    setSuggestions([])
                                }}
                                style={{ padding: 8, cursor: "pointer" }}
                            >
                                {city}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
