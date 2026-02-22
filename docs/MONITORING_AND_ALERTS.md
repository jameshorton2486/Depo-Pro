# Monitoring And Alerts (Beta)

## Vercel Analytics
1. Open Vercel project dashboard
2. Enable `Analytics`

## Health Endpoint Monitoring
Monitor `GET /api/health` every 5 minutes using:
- UptimeRobot
- Better Uptime
- or equivalent

Alert on:
- non-200 responses
- response times above baseline

## Production Error Logging
Critical API routes should emit `[CRITICAL]` log lines on caught production errors.
These are visible in Vercel Function logs and should be reviewed daily during beta.

## Suggested Daily Ops Checklist
1. Review `[CRITICAL]` logs from last 24h
2. Review `/api/health` uptime report
3. Check recent deploys and failed function executions
4. Triage and prioritize user-reported issues
