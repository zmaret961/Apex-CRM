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
   enterprise set (Wiz, Axonius, Palantir, Cloudflare…) into Accounts — the
   queue preview lists who you're about to import.
   Then open **Research**: each brief card can be promoted to the pipeline in
   one click, and the drawer's **Copy brief** button hands you a markdown
   outreach brief for the account.
6. Press **⌘K**, type a company name, hit Enter — the map flies to its pin
   and opens the drawer. Then open **Focus** and clear the suggested actions
   with one click each.

## Pages

| Route | What it is |
|---|---|
| `/` | Full-viewport map, clustered glowing pins, live filters, company drawer. Deep link: `/?focus=<id>` flies to a pin and opens its drawer |
| `/focus` | Next-best-action queue: Apex tells you what to do next — refresh stale research, advance ready deals, research top-fit accounts. Includes the competitive-surface rollup |
| `/accounts` | Searchable card list of every account. Deep link: `/accounts?open=<id>` |
| `/opportunities` | Kanban: Identified → Researched → Engaged → Demo Scheduled → Proposal → Closed Won/Lost. Cards show days-in-stage; click for the drawer, or advance a stage from the drawer |
| `/research` | Feed of agent briefs; every claim cites a source. Filter by company/category; one-click promote to pipeline |
| `/automation` | Agent console: run sweeps, import discovered enterprises, live activity log |

## Data honesty

Every factual field and research claim carries a `sourceUrl`. Confirmed
customers are limited to publicly-discussed Devin accounts (Goldman Sachs,
Citi, Ramp, Modal, AngelList, Reducto, Litera, Eight Sleep, Hippo). Where
contract value isn't public, the UI says so rather than inventing a number.
See `AGENTS.md` for the full rules.

## Speed layer

- **⌘K / Ctrl-K** opens the command palette anywhere: fuzzy-find any account
  (jump straight to its pin on the map), **search all research** (type
  "copilot" → every account whose brief mentions it), run a research sweep,
  export the book to CSV, or hop pages.
- Single-key nav when not typing: `m` map · `f` focus · `o` opportunities ·
  `a` accounts · `r` research · `u` automation. `Esc` closes the drawer.
- The company drawer has a per-account **activity timeline** (pipeline moves,
  research runs, imports) and **notes** — pipeline moves are auto-logged, so
  the board stays honest with zero data entry.
- **Copy brief** in the drawer copies a markdown outreach brief (fit, signals,
  why-now, cited evidence) straight into your clipboard.
- Kanban cards show **days in stage** (from the event log, amber past 30d),
  every drag move posts an **Undo toast**, and the drawer can advance or
  remove a deal without leaving the page.
- **Focus** opens with a pipeline-at-a-glance strip; suggestions can be
  **snoozed 7 days** and restored inline.
- **Accounts** exports the current filtered view to CSV in one click.

## Notes

- Database file: `data/apex.db` (gitignored). `npm run seed` resets it.
- `npm run lint` — ESLint (next/core-web-vitals).
- Want real Mapbox instead of the free basemap? Set `NEXT_PUBLIC_MAPBOX_TOKEN`
  and swap `BASEMAP` in `components/MapView.tsx`.
