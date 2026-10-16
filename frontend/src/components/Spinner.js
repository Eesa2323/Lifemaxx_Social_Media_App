import { useEffect, useState } from "react"
import { MoonLoader } from "react-spinners"

const Spinner = ({ withStyles, size, noDelay, delayTime }) => {
    const [isDisplayed, setIsDisplayed] = useState(false)

    const delay = delayTime || 190
    const spinnerSize = size || 60
    const containerStyle = withStyles === false ? null : styles.spinnerContainer

    useEffect(() => {
        if (noDelay) return

        let timer = setTimeout(() => {
            setIsDisplayed(true)
        }, delay)

        return () => clearTimeout(timer)
    }, [delay, noDelay])

    return (
        (isDisplayed || noDelay) && (
            <div style={containerStyle}>
                <MoonLoader
                    color='white'
                    size={spinnerSize}
                />
            </div>
        )
    )
}

const styles = {
    spinnerContainer: {
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
    },
}

export default Spinner
