# Apex — NYC Prospecting CRM

A portfolio-quality local CRM for selling **Devin** (Cognition's autonomous AI
software engineer) to enterprises with NYC engineering presence. Dark
liquid-glass UI, real company data, a glowing live map, and an agentic
research loop — all running locally on SQLite.

![stack](https://img.shields.io/badge/Next.js-15-black) ![db](https://img.shields.io/badge/SQLite-better--sqlite3-blue)

## Run it

```bash
./start.sh        # or: npm install && npm run dev
```

Then open **http://localhost:3000**. The database seeds itself on first
launch (~135 real companies + 15 written research briefs). No API keys
required — the map uses the free CARTO dark basemap.

## 60-second demo script

1. **Map** (`/`) — you'll see ~135 glowing pins over dark NYC.
   Green = confirmed Devin customer, blue = high-fit prospect, gray = researched.
2. Click **Goldman Sachs** or **Ramp** (both in Lower Manhattan / Flatiron) —
   the glass drawer shows the green **Customer** pill, "Confirmed customer —
   ARR not public", key signals with sources, and the research summary.
3. Click **Add to Opportunities**, then go to **Opportunities** and drag a
   card from *Identified* → *Engaged* → *Demo Scheduled*.
4. Go to **Automation** → **Run research sweep** and watch the queue and the
   live log as briefs get written (e.g. Datadog, Two Sigma). The new briefs
   appear live on the **Research** page.
5. On Automation, hit **Import discovered enterprises** to pull the queued
   enterprise set (Wiz, Axonius, Palantir, Cloudflare…) into Accounts.

## Pages

| Route | What it is |
|---|---|
| `/` | Full-viewport map, clustered glowing pins, live filters, company drawer |
| `/accounts` | Searchable card list of every account |
| `/opportunities` | Kanban: Identified → Researched → Engaged → Demo Scheduled → Proposal → Closed Won/Lost |
| `/research` | Feed of agent briefs; every claim cites a source |
| `/automation` | Agent console: run sweeps, import discovered enterprises, live activity log |

## Data honesty

Every factual field and research claim carries a `sourceUrl`. Confirmed
customers are limited to publicly-discussed Devin accounts (Goldman Sachs,
Citi, Ramp, Modal, AngelList, Reducto, Litera, Eight Sleep, Hippo). Where
contract value isn't public, the UI says so rather than inventing a number.
See `AGENTS.md` for the full rules.

## Notes

- Database file: `data/apex.db` (gitignored). `npm run seed` resets it.
- Want real Mapbox instead of the free basemap? Set `NEXT_PUBLIC_MAPBOX_TOKEN`
  and swap `BASEMAP` in `components/MapView.tsx`.
