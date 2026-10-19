"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface Integration {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  category: string;
  soon?: boolean;
}

const INTEGRATIONS: Integration[] = [
  // CRM & data
  { id: "salesforce", name: "Salesforce", icon: "☁️", category: "CRM & Data", blurb: "Two-way sync: push Apex accounts and pipeline moves into your org's SFDC instance." },
  { id: "hubspot", name: "HubSpot", icon: "🟠", category: "CRM & Data", blurb: "Mirror companies and deals so marketing and sales share one record." },
  { id: "snowflake", name: "Snowflake", icon: "❄️", category: "CRM & Data", blurb: "Join Apex accounts to firmographic and usage data in your warehouse." },
  { id: "clay", name: "Clay", icon: "🧱", category: "Prospecting", blurb: "Enrich every account — tech stack, headcount growth, hiring signals." },
  { id: "salesnav", name: "LinkedIn Sales Navigator", icon: "💼", category: "Prospecting", blurb: "Surface champion contacts at each account; import lead lists in one click." },
  { id: "apollo", name: "Apollo.io", icon: "🚀", category: "Prospecting", blurb: "Verified emails and direct dials for the buyers on your account list." },
  { id: "zoominfo", name: "ZoomInfo", icon: "🔭", category: "Prospecting", blurb: "Org charts, intent data, and technographics auto-attached to accounts." },
  { id: "clearbit", name: "Clearbit", icon: "🧪", category: "Prospecting", blurb: "Domain-based enrichment: employee counts, funding, categories." },
  // Outreach
  { id: "outreach", name: "Outreach", icon: "📣", category: "Outreach", blurb: "Push hot leads into sequences; sync replies back to the account timeline." },
  { id: "salesloft", name: "Salesloft", icon: "🎯", category: "Outreach", blurb: "Cadence sync — open deals and call outcomes land on the company record." },
  { id: "gmail", name: "Gmail & Calendar", icon: "✉️", category: "Outreach", blurb: "Log every email and meeting against the account automatically." },
  { id: "instantly", name: "Instantly", icon: "⚡", category: "Outreach", blurb: "Cold-email campaigns with reply detection feeding Hot Leads." },
  // Meetings & comms
  { id: "slack", name: "Slack", icon: "💬", category: "Meetings & Comms", blurb: "Post new hot leads, stage moves, and sweep results to a deal room channel." },
  { id: "gong", name: "Gong", icon: "🎙️", category: "Meetings & Comms", blurb: "Call recordings and talk-track analytics attached to each opportunity." },
  { id: "zoom", name: "Zoom", icon: "🎥", category: "Meetings & Comms", blurb: "Demos auto-logged; recordings linked on the company timeline." },
  // Intel
  { id: "crunchbase", name: "Crunchbase", icon: "📊", category: "Intel", blurb: "Funding events and leadership changes as buying signals on the map." },
  { id: "linkedin-jobs", name: "LinkedIn Jobs", icon: "🧲", category: "Intel", blurb: "Hiring-spike detection — flag accounts scaling their engineering org." },
  { id: "builtwith", name: "BuiltWith", icon: "🔧", category: "Intel", blurb: "See which accounts run competitor AI coding tools today." },
  // Automation
  { id: "zapier", name: "Zapier", icon: "🔗", category: "Automation", blurb: "Trigger Apex events into 6,000+ apps — no code required." },
  { id: "webhooks", name: "Webhooks", icon: "🪝", category: "Automation", blurb: "Push every pipeline change and research brief to your own endpoint." },
  { id: "airtable", name: "Airtable", icon: "🗂️", category: "Automation", blurb: "Sync the book into a shared ops table for ops and marketing." },
  { id: "notion", name: "Notion", icon: "📝", category: "Automation", blurb: "Export account briefs and battlecards into your team's wiki.", soon: true },
];

const CATEGORIES = ["CRM & Data", "Prospecting", "Outreach", "Meetings & Comms", "Intel", "Automation"];

const KEY = "apex-integrations";

export default function Integrations() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setConnected(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    } catch {
      setConnected({});
    }
    setLoaded(true);
  }, []);

  function toggle(id: string) {
    setConnected((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div>
      <div className="glass mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-white">{connectedCount}</span> connected ·{" "}
          <span className="text-gray-500">{INTEGRATIONS.length - connectedCount} available</span>
        </p>
        <p className="text-xs text-gray-500">
          Demo connectors — they model the plug-in surface; no external calls are made.
        </p>
      </div>
      {CATEGORIES.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {INTEGRATIONS.filter((i) => i.category === cat).map((i) => {
              const on = !!connected[i.id];
              return (
                <div key={i.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl" aria-hidden>{i.icon}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{i.name}</p>
                        <p
                          className={clsx(
                            "text-[11px]",
                            on ? "text-emerald-300" : i.soon ? "text-gray-600" : "text-gray-500"
                          )}
                        >
                          {on ? "● Connected (demo)" : i.soon ? "Coming soon" : "Not connected"}
                        </p>
                      </div>
                    </div>
                    {i.soon ? (
                      <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-gray-600">Soon</span>
                    ) : (
                      <button
                        onClick={() => toggle(i.id)}
                        disabled={!loaded}
                        className={clsx(
                          "interactive rounded-lg px-2.5 py-1 text-xs font-medium",
                          on
                            ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                            : "bg-accent-soft/10 text-accent-soft hover:bg-accent-soft/20"
                        )}
                      >
                        {on ? "Disconnect" : "Connect"}
                      </button>
                    )}
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-gray-400">{i.blurb}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
