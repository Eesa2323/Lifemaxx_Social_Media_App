import dayjs from "dayjs"

export function formatNotificationDate(notifDate) {
    const today = dayjs(new Date())
    const differenceInMinutes = today.diff(dayjs(notifDate), "minutes")

    let unit

    if (differenceInMinutes < 1) unit = "seconds"
    else if (differenceInMinutes < 60) unit = "minutes"
    else if (differenceInMinutes < 1440) unit = "hours"
    else if (differenceInMinutes < 1440 * 7) unit = "days"
    else unit = "weeks"

    return `${today.diff(dayjs(notifDate), unit)}${unit[0]}`
}
