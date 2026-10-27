# Time zone

Reservations are stored as `timestamptz` (UTC). Rate windows (`rates.start_time`, `end_time`) and `day_of_week` are local wall times. The app converts with one zone, `APP_TIME_ZONE` (default `Asia/Manila`).

- Always build instants with `atLocal(date, time)` from `src/server/time.ts`. Do not use `new Date("2026-11-02T16:00")`: it uses the machine zone.
- Always read local date, day, and minutes with `localParts()`.
- A booking must start and end on the same local date. A rate window cannot cross midnight (`end_time > start_time`).
- Tests pass `now` into domain functions. Do not call `new Date()` inside rules that tests must control.
