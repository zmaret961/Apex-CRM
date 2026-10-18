# AGENTS.md — Apex CRM

## What this is
Apex is a **local-only** prospecting CRM demo for selling Devin (Cognition's
autonomous AI software engineer) to enterprise and emerging-enterprise
companies with NYC engineering presence. There is no real CRM, Salesforce,
or Cognition-internal system involved. Everything runs on localhost.

## Stack
- Next.js 15 (App Router) + TypeScript + React 19
- Tailwind CSS 3 — custom "liquid glass" dark design system
- SQLite via better-sqlite3 (`data/apex.db`, auto-created + auto-seeded;
   `PRAGMA user_version` data migrations patch existing DBs without reseeding)
- MapLibre GL JS + react-map-gl with the free CARTO dark basemap
  (no API token required). To use real Mapbox instead, set
  `NEXT_PUBLIC_MAPBOX_TOKEN` and swap the style URL in `components/MapView.tsx`.
- @dnd-kit for the Opportunities kanban

## Architecture
- `data/dataset.ts` — the seed dataset. ~135 real NYC companies + 10
  "discovered" enterprises + hand-written seed briefs. **This is the source
  of truth for data quality.**
- `lib/db.ts` — better-sqlite3 singleton; creates schema and seeds on first
  open. `lib/queries.ts` — all reads/writes. `lib/research.ts` — deterministic
  brief synthesizer. `lib/agent.ts` — in-process research-sweep runner.
- `app/api/*` — thin JSON routes over those libs (`/api/companies`
  (filters: q, industry, status, stage=open|none|<stage>), `/api/companies/[id]`,
  `/api/research`, `/api/agent`, `/api/focus`, `/api/search`.
  Accounts exports the current filtered view to CSV client-side (no backend).
- `app/page.tsx` = Map (index). `/focus`, `/accounts`, `/opportunities`,
  `/research`, `/automation`.
- `components/CompanyDrawer.tsx` — the shared slide-over used by Map,
  Accounts, Research, Opportunities, and Focus (deep links: `/?focus=<id>`,
  `/accounts?open=<id>` — both reactive via `useSearchParams`, so they also
  work when already on the page). It hosts the activity timeline, notes,
  stage advance/remove, and "Copy brief" (markdown outreach brief → clipboard).
- `listBriefs()` joins `companyPipelineStage` so the feed can promote a
  brief to the pipeline in one click (hidden for confirmed customers);
  `listCompanies()` returns `stageChangedAt` (latest `pipeline` event ts)
  which kanban cards render as "Nd in stage".
- `components/CommandPalette.tsx` — global ⌘K palette + single-key nav
  (mounted in `app/layout.tsx`).
- `suggestedActions()` in `lib/queries.ts` — the next-best-action rules that
  power Focus: stale-pipeline refresh, advanceable deals, customer/competitor
  intel refresh, stuck deals (14+d in an active stage), unresearched
  top-fit prospects. `intelSummary()` aggregates competitor mentions.
  `weeklyDigest()` counts the last 7 days of company_events for the Focus
  activity strip, which also hosts a one-click research-sweep button with
  live progress (same job runner as Automation).

## Data model (tables)
- `companies` — name, domain, industry, address, lat/lng, employees, funding,
  status (`customer`/`prospect`/`researched`), fitScore, pipelineStage,
  estimatedValue, lastResearchAt, description, sources[] (JSON), signals[] (JSON),
  discovered (0 = imported, 1 = in the auto-import queue).
- `research_briefs` — whatTheyDo, whyNow, per company.
- `research_claims` — category, text, sourceUrl per brief.
- `activity_log` — timestamped agent events (sweeps, imports, pipeline moves).
- `company_events` — per-account timeline: pipeline moves, research runs,
  imports, status changes, and seller notes. Written automatically by the
  query layer — never require a seller to type what the system already knows.

## NON-NEGOTIABLE RULES
1. **Every factual field and every research claim must cite a source URL.**
   Never invent ARR, contract values, employee counts presented as precise,
   or URLs. When a number isn't public, write e.g. "Confirmed customer —
   ARR not public". Sources use real, stable URLs (company site, engineering
   blog root, LinkedIn/Crunchbase org page, public press page).
2. Confirmed Devin customers get `status: "customer"` and a green indicator
   everywhere. Only the publicly-discussed list in `data/dataset.ts` may have
   this status. Companies that MAKE competing AI coding tools (OpenAI,
   Anthropic, Microsoft, Google) get `status: "competitor"` (rose indicator)
   — they're intel targets, never sell-to prospects: keep them out of
   `pipelineStage` and out of Focus suggestions.
3. Dark mode is the only mode. Liquid-glass surfaces (`glass` / `glass-deep`
   classes), hairline borders, `interactive` hover/pressed states on every
   control. The map and research views are the visual centerpieces — keep
   them exceptional.
4. No new backend services, accounts, or API keys. The app must keep working
   fully offline after `npm install`.
5. **The CRM suggests; the seller clicks.** Prefer surfacing next actions
   (Focus page, auto-logged activity) over adding form fields — data entry
   is a tax on selling time. Forgiving controls beat confirmations: every
   kanban stage move posts an Undo toast; Focus suggestions can be snoozed
   for 7 days (localStorage, restorable inline).
6. API writes are validated (`isPipelineStage`, `isCompanyStatus`). Notes
   are capped at 2000 chars. Don't accept unvalidated writes.

## Coordinates
lat/lng values are accurate to the stated HQ/office address, or to the
company's publicly-known NYC neighborhood when no street address is public.
Non-NYC companies (AngelList, Hippo, Reducto) use their real HQ city.

## Commands
- `npm run dev` — dev server on :3000
- `npm run build` / `npm start` — production build
- `npm run seed` — delete the DB so it re-seeds on next boot
- `npm run lint` — ESLint (next/core-web-vitals)
