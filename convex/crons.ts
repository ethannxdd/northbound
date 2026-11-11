import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// The ECB publishes around 16:00 CET; fetch early each morning (UTC).
crons.cron('refresh rand to pound', '0 5 * * *', internal.fx.refresh, {})

// Reminders at 07:00 UTC, which is 09:00 in Cape Town and 07:00 or 08:00 in the UK.
crons.cron('send reminders', '0 7 * * *', internal.pushSend.sendDaily, {})

export default crons
