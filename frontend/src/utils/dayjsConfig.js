import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import localeEn from "dayjs/locale/en"
import updateLocale from "dayjs/plugin/updateLocale"

dayjs.extend(relativeTime).locale(localeEn)
dayjs.extend(updateLocale)

dayjs.updateLocale("en", {
    relativeTime: {
        future: "in %s",
        past: "%s ago",
        s: "A few seconds",
        m: "1 minute",
        mm: "%d minutes",
        h: "1 hour",
        hh: "%d hours",
        d: "1 day",
        dd: "%d days",
        M: "1 month",
        MM: "%d months",
        y: "1 year",
        yy: "%d years",
    },
})
