export function greeting(timeZone: string, now = new Date()) {
  let h = now.getHours() // this phone's clock, if the saved timezone is one it doesn't know
  try {
    h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone }).format(now))
  } catch { /* keep the device hour */ }
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** The financial year's start day, kept to a day the month has (February counts 28). */
export const fyStartDay = (month: number, day: number) => Math.min(Math.max(1, day), new Date(Date.UTC(2023, month, 0)).getUTCDate())
