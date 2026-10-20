export interface Session {
  timeZone: string;
  open: string; // "HH:MM" local
  close: string;
  days: number[]; // 0=Sun .. 6=Sat
}

export const SESSIONS = {
  us: { timeZone: 'America/New_York', open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] },
  india: { timeZone: 'Asia/Kolkata', open: '09:15', close: '15:30', days: [1, 2, 3, 4, 5] },
  global: { timeZone: 'UTC', open: '00:00', close: '23:59', days: [1, 2, 3, 4, 5] },
} satisfies Record<string, Session>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Regular session check in the exchange's own timezone. Exchange holidays are not modelled. */
export function isSessionOpen(session: Session, now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: session.timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = WEEKDAYS.indexOf(get('weekday'));
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  return session.days.includes(day) && minutes >= toMinutes(session.open) && minutes < toMinutes(session.close);
}
