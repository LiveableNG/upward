/**
 * Laravel-style fluent schedule builder.
 *
 * Jobs are evaluated every minute by ScheduleService; each entry's
 * `isDue(parts)` decides whether it runs this tick.
 */

export type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: string // Sun, Mon, Tue, ...
}

export type ScheduleHandler = () => Promise<void>

export type ScheduledJob = {
  name: string
  handler: ScheduleHandler
  isDue: (parts: ZonedParts) => boolean
  withoutOverlapping: boolean
  description?: string
}

export class ScheduledEvent {
  private _withoutOverlapping = false
  private _isDue: (parts: ZonedParts) => boolean = () => false
  private _description?: string

  constructor(
    private readonly name: string,
    private readonly handler: ScheduleHandler,
  ) {}

  everyMinute(): this {
    this._isDue = () => true
    return this
  }

  everyFiveMinutes(): this {
    this._isDue = (p) => p.minute % 5 === 0
    return this
  }

  everyFifteenMinutes(): this {
    this._isDue = (p) => p.minute % 15 === 0
    return this
  }

  everyThirtyMinutes(): this {
    this._isDue = (p) => p.minute % 30 === 0
    return this
  }

  hourly(): this {
    this._isDue = (p) => p.minute === 0
    return this
  }

  hourlyAt(minute: number): this {
    this._isDue = (p) => p.minute === minute
    return this
  }

  /** Run once per day at HH:MM (24h). */
  dailyAt(time: string): this {
    const [h, m] = parseHm(time)
    this._isDue = (p) => p.hour === h && p.minute === m
    return this
  }

  /** Cron-like: "M H * * *" for minute + hour only (day-of-week wildcards via days()). */
  cron(expression: string): this {
    const [minPart, hourPart] = expression.trim().split(/\s+/)
    const minutes = parseCronField(minPart ?? '*', 0, 59)
    const hours = parseCronField(hourPart ?? '*', 0, 23)
    this._isDue = (p) => minutes.has(p.minute) && hours.has(p.hour)
    return this
  }

  withoutOverlapping(): this {
    this._withoutOverlapping = true
    return this
  }

  description(text: string): this {
    this._description = text
    return this
  }

  build(): ScheduledJob {
    return {
      name: this.name,
      handler: this.handler,
      isDue: this._isDue,
      withoutOverlapping: this._withoutOverlapping,
      description: this._description,
    }
  }
}

export class Schedule {
  private readonly events: ScheduledEvent[] = []

  call(name: string, handler: ScheduleHandler): ScheduledEvent {
    const event = new ScheduledEvent(name, handler)
    this.events.push(event)
    return event
  }

  build(): ScheduledJob[] {
    return this.events.map((e) => e.build())
  }
}

/** Extract calendar parts in a given IANA timezone. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const cleanTimeZone = timeZone.startsWith(':') ? timeZone.substring(1) : timeZone;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: cleanTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0'

  let hour = Number(get('hour'))
  // Some engines emit "24" for midnight with hourCycle h23
  if (hour === 24) hour = 0

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour,
    minute: Number(get('minute')),
    weekday: get('weekday'),
  }
}

function parseHm(time: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) {
    throw new Error(`Invalid dailyAt time "${time}" — expected "HH:MM"`)
  }
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Invalid dailyAt time "${time}"`)
  }
  return [h, m]
}

/** Supports *, N, N-M, *\/N, N\/N for a single cron field. */
function parseCronField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>()
  if (field === '*') {
    for (let i = min; i <= max; i++) values.add(i)
    return values
  }

  for (const part of field.split(',')) {
    const stepMatch = /^(\*|\d+)(?:\/(\d+))?$/.exec(part)
    const rangeMatch = /^(\d+)-(\d+)(?:\/(\d+))?$/.exec(part)

    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      const step = Number(rangeMatch[3] ?? 1)
      for (let i = start; i <= end; i += step) values.add(i)
    } else if (stepMatch) {
      const step = Number(stepMatch[2] ?? 1)
      if (stepMatch[1] === '*') {
        for (let i = min; i <= max; i += step) values.add(i)
      } else {
        const start = Number(stepMatch[1])
        for (let i = start; i <= max; i += step) values.add(i)
      }
    } else if (/^\d+$/.test(part)) {
      values.add(Number(part))
    } else {
      throw new Error(`Unsupported cron field segment: ${part}`)
    }
  }
  return values
}
