# Yugaantar Fest Pass Funnel

A live, public dashboard that shows where Fest Pass buyers drop off, plus a page of fixes for the tech team.

- `/` shows the funnel, from visitors to paid passes, with hourly and daily breakdowns, segments and checkout behaviour.
- `/solutions` has nine tickets for the yugaantar.org team. Each one shows the live number it should move.
- `/api/funnel` returns the same data as JSON.

## How the data works

Everything comes from PostHog project `602554`:

| Funnel step | PostHog source |
| --- | --- |
| Visited / signed in | `$pageview`, with `person.properties.email` set |
| Opened the pass page | `$pageview` where `$pathname = /pass` |
| Opened checkout | `fest_pass_window_opened` |
| Tried to pay | server-side `payment.status_changed` with `fest_pass = true` and status `authorized`, `paid`, `failed` or a refund status |
| Bought | latest money status for that person is still `paid` (refunds drop out) |

Free SST and SSB students are excluded from the main funnel. On 21 Nov 2026 these numbers matched the staff payments list exactly (125 checkout openers, 4 payment attempts, 2 kept passes).

**Refresh:** queries are cached for 10 minutes (`unstable_cache` plus ISR). There's no database and no cron: PostHog is the store, and the dashboard re-queries at most once per 10 minutes no matter how many people view it. That's about 66 queries an hour, which stays under PostHog's query rate limit.

**Privacy:** the site shows aggregate counts only. No emails or names are ever returned, and the API key stays on the server.

## Run locally

```bash
npm install
cp .env.example .env.local   # add POSTHOG_PERSONAL_API_KEY for live data
npm run dev
```

Without a key, `npm run dev` shows a saved real snapshot (`lib/fixture.json`) with a "Sample snapshot" label. Production never uses it.

```bash
npm test
```

## Deploy to Vercel

1. Push this repo to GitHub, then import it at vercel.com/new. The framework (Next.js) is detected automatically.
2. In PostHog, go to Settings → Personal API keys and create a key with only the **Query: Read** scope, limited to this project.
3. In Vercel, go to Settings → Environment Variables and add `POSTHOG_PERSONAL_API_KEY`. The other values in `.env.example` are optional.
4. Deploy. The page refreshes itself every 10 minutes.

To change the refresh interval, edit `REFRESH_SECONDS` in `lib/queries.js` and the `revalidate` exports in `app/`. To change the target or dates, set `FEST_PASS_TARGET`, `PASS_LAUNCH_DATE` or `FEST_END_DATE`.
