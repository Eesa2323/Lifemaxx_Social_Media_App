export const Skeleton = ({ variant, style, className }) => {
    return (
        <div
            className={`skeleton ${variant || ""} ${className || ""}`}
            style={{
                ...styles.skeleton,
                ...(variant && styles[variant]),
                ...style,
            }}
        />
    )
}

const styles = {
    skeleton: {
        backgroundColor: "#1a1a1a",
        position: "relative",
        overflow: "hidden",
    },
    card: {
        borderRadius: "12px",
        padding: "1.25rem",
        border: "1px solid #333",
        minHeight: "175px",
        display: "flex",
        flexDirection: "column",
    },
    text: {
        height: "1rem",
        width: "100%",
        borderRadius: "4px",
    },
    title: {
        height: "1.5rem",
        width: "70%",
        borderRadius: "4px",
    },
}

export default Skeleton
