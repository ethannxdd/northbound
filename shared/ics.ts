import type { Task } from './timeline'

// Builds an .ics calendar file: one all-day event per step, with a reminder the day before.

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function day(iso: string): string {
  return iso.replace(/-/g, '')
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/** Lines longer than 75 octets must be folded (RFC 5545). */
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function buildIcs(tasks: Task[], opts: { stamp: string; done: Set<string> }): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Northbound//Move plan//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Northbound move plan']
  for (const t of tasks) {
    if (opts.done.has(t.key)) continue
    const detail = [t.cost ? `Costs: ${t.cost}` : '', t.takes ? `Takes: ${t.takes}` : '', ...t.steps.map((s, i) => `${i + 1}. ${s}`), t.url ?? ''].filter(Boolean).join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.key}@northbound`,
      `DTSTAMP:${opts.stamp}`,
      `DTSTART;VALUE=DATE:${day(t.due)}`,
      `DTEND;VALUE=DATE:${nextDay(t.due)}`,
      fold(`SUMMARY:${esc(t.title)}`),
      fold(`DESCRIPTION:${esc(detail)}`),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${esc(t.title)}`),
      'TRIGGER:-PT15H',
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
