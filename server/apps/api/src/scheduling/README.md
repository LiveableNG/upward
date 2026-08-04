# Schedule Kernel (Cron)

Laravel-style job scheduler for the Nest API. Recurring work is defined in one place and runs inside the always-on `upward-api` process (PM2). **No OS crontab and no GitHub Actions schedule are required.**

## How it works

```text
PM2 keeps upward-api running
        │
        ▼
Nest ScheduleModule fires every minute
        │
        ▼
ScheduleService.tick()
        │
        ▼
For each job in defineSchedule():
  is it due in Africa/Lagos right now?
    yes → run handler (unless still overlapping)
    no  → skip
```

Think of it like Laravel:

| Laravel | Here |
|---|---|
| `app/Console/Kernel.php` → `schedule()` | `schedule.service.ts` → `defineSchedule()` |
| `* * * * * php artisan schedule:run` | Nest `@Cron(EVERY_MINUTE)` → `tick()` |
| `->withoutOverlapping()` | `.withoutOverlapping()` |
| `php artisan schedule:run` (manual) | `GET /api/v1/public/cron/run` |

### Files

| File | Role |
|---|---|
| `schedule.builder.ts` | Fluent helpers (`everyMinute`, `hourly`, `dailyAt`, …) |
| `schedule.service.ts` | Kernel: job list + 1-minute tick + overlap guard |
| `scheduling.module.ts` | Nest module (imported by `AppModule` / `HttpModule`) |
| `../interfaces/http/public/cron.controller.ts` | Optional manual HTTP trigger |

Do **not** put `@Cron` on individual services. Register jobs only in `defineSchedule()`.

## Registered jobs

| Name | Schedule (Africa/Lagos) | What it does |
|---|---|---|
| `bulkInvites` | every minute | Process pending bulk tenant invites |
| `webhooks` | every 15 minutes | Retry failed outbound webhooks |
| `reminders` | hourly | Payment reminders + scheduled requests / sequences |
| `settlements` | hourly | Settlements and automated refunds |
| `rentReminders` | daily at 08:00 | Tenant rent-end reminders |
| `dailySequences` | daily at 08:00 | Queue daily WhatsApp / email sequences |
| `homeRequestDigest` | daily at 08:00 | Email digest of prior day's home requests, sent to all PMs |
| `pmDailyDigest` | daily at 09:00 | PM daily rent digests |

## Adding a new job

1. Put the work in a service or use case (exported from `ApplicationModule`).
2. Inject that class into `ScheduleService`.
3. Register it in `defineSchedule()`:

```ts
s.call('weeklyReport', () => this.reportService.sendWeeklyReport())
  .dailyAt('08:00')
  .withoutOverlapping()
  .description('Weekly landlord report')
```

### Frequency helpers

```ts
.everyMinute()
.everyFiveMinutes()
.everyFifteenMinutes()
.everyThirtyMinutes()
.hourly()              // minute 0 of every hour
.hourlyAt(30)          // minute 30 of every hour
.dailyAt('08:00')      // once per day (HH:MM, 24h)
.cron('0 8 * * *')     // minute + hour fields (*, */n, ranges, lists)
```

Always chain `.withoutOverlapping()` for jobs that might run longer than their interval.

4. Deploy. After restart you should see:

```text
Schedule kernel ready (tz=Africa/Lagos): bulkInvites, webhooks, ..., weeklyReport
```

## Server setup

### Required

Nothing beyond a running `upward-api` under PM2. Scheduling starts automatically when the process boots.

### Optional env (`server/apps/api/.env`)

```env
# Timezone used to decide "is this job due?" (default: Africa/Lagos)
SCHEDULE_TIMEZONE=Africa/Lagos

# Only needed for the manual HTTP endpoint below
CRON_SECRET=<openssl rand -hex 32>

# Set only if you intentionally disable the in-process tick
# (e.g. you switched to an external crontab driver)
# DISABLE_INTERNAL_CRON=true
```

### Confirm it is live

```bash
pm2 logs upward-api --lines 100 | grep "Schedule kernel ready"
```

Ongoing run logs:

```text
[schedule] Running settlements...
[schedule] settlements completed in 842ms
```

Log files (from PM2 ecosystem):

- `/var/log/upward/api-out.log`
- `/var/log/upward/api-error.log`

Or: `pm2 logs upward-api`

## Manual run (optional)

Useful for recovery or testing one job without waiting for the next tick.

Requires `CRON_SECRET` in the API env. Prefer loopback so traffic never hits Nginx:

```bash
# one job
curl -fsS "http://127.0.0.1:4000/api/v1/public/cron/run?secret=$CRON_SECRET&tasks=settlements"

# several jobs
curl -fsS "http://127.0.0.1:4000/api/v1/public/cron/run?secret=$CRON_SECRET&tasks=reminders,settlements"

# every registered job once
curl -fsS "http://127.0.0.1:4000/api/v1/public/cron/run?secret=$CRON_SECRET"
```

If `CRON_SECRET` is unset, the endpoint returns `401` and scheduled jobs still run normally.

Legacy aliases still accepted: `paymentReminders` → `reminders`, `processScheduledRequests` → `reminders`, `refunds` → `settlements`.

## Important constraints

1. **Single API instance.** Overlap locking is in-memory. Keep `upward-api` at one PM2 instance unless you add a shared lock (DB/Redis).
2. **API downtime = cron downtime.** If PM2 stops the API (including during API maintenance / migrate), scheduled jobs pause until it is back. That is intentional.
3. **No crontab needed.** Do not also register the same jobs in system crontab or GitHub Actions — they would double-run.
4. **No `@Cron` on services.** The Kernel is the only schedule source of truth.

## Related

- Deploy / API maintenance: `scripts/maintenance.sh`, `scripts/deploy.sh`
- Nest schedule package: `@nestjs/schedule` (provides the 1-minute tick only)
