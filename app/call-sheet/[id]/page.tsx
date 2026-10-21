import { notFound } from "next/navigation";
import {
  accountIntelFor,
  briefsFor,
  contactsFor,
  eventsFor,
  execsFor,
  getCompany,
  sequenceFor,
} from "@/lib/queries";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

// Same math as the account drawer's ROI estimator.
function roiValue(engCount: number, avgComp: number, hoursSaved: number): number {
  return engCount * hoursSaved * 48 * (avgComp / 2080);
}

function host(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function dt(ts: string | null | undefined): string {
  if (!ts) return "";
  const t = ts.includes("T") ? ts : ts.replace(" ", "T") + "Z";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLE: Record<string, string> = {
  customer: "bg-emerald-100 text-emerald-800",
  prospect: "bg-sky-100 text-sky-800",
  researched: "bg-slate-100 text-slate-700",
  competitor: "bg-rose-100 text-rose-800",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid rounded-xl border border-slate-200 p-4">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function CallSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = getCompany(Number(id));
  if (!company) notFound();

  const briefs = briefsFor(company.id);
  const brief = briefs[0];
  const contacts = contactsFor(company.id);
  const execs = execsFor(company.id);
  const sequence = sequenceFor(company.id);
  const intel = accountIntelFor(company.id);
  const events = eventsFor(company.id);
  const lastTouch = events[0];

  // Same defaults as the drawer's ROI estimator.
  const estEng = Math.max(50, Math.round((company.employees || 500) * 0.2));
  const avgComp = 185000;
  const hoursSaved = 5;
  const roi = roiValue(estEng, avgComp, hoursSaved);
  const devHours = estEng * hoursSaved * 48;

  const seqDone = sequence ? sequence.steps.filter((s) => s.done).length : 0;
  const seqNext = sequence
    ? (() => {
        const i = sequence.steps.findIndex((s) => !s.done);
        if (i < 0) return null;
        const due =
          new Date(sequence.startedAt.replace(" ", "T") + "Z").getTime() +
          sequence.steps[i].day * 86400000;
        return { label: sequence.steps[i].label, due: new Date(due) };
      })()
    : null;

  const claimSources = [
    ...new Set(
      (brief?.claims ?? [])
        .map((c) => host(c.sourceUrl))
        .filter((h): h is string => Boolean(h))
    ),
  ].slice(0, 8);
  const allSources = [...new Set([...(company.sources ?? []).map(host), ...claimSources])].filter(
    Boolean
  );

  return (
    <main className="min-h-screen bg-slate-200 py-8 text-slate-800 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white px-10 py-8 shadow-xl print:max-w-none print:rounded-none print:px-6 print:py-4 print:shadow-none">
        {/* Sheet header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/apex-mark.svg" alt="" className="h-9 w-9" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Apex · Call sheet
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {company.name}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900">fit {company.fitScore}</p>
            <p className="text-xs text-slate-500">
              {company.pipelineStage ?? "not in pipeline"}
            </p>
          </div>
        </div>

        {/* Meta strip */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[company.status] ?? "bg-slate-100 text-slate-700"}`}
          >
            {company.status}
          </span>
          <span>{company.industry}</span>
          <span>{company.employees.toLocaleString()} employees</span>
          <span>{company.funding}</span>
          <span>{company.address}</span>
          <a href={`https://${company.domain}`} className="text-indigo-600 underline">
            {company.domain}
          </a>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <Section title="What they do">
              <p className="text-sm leading-relaxed">
                {brief?.whatTheyDo ?? company.description ?? "No research brief yet — run research before the call."}
              </p>
            </Section>

            <Section title="Why now">
              <p className="text-sm leading-relaxed">
                {brief?.whyNow ?? "—"}
              </p>
              {brief && brief.claims.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {brief.claims.slice(0, 5).map((c) => (
                    <li key={c.id} className="text-xs leading-snug text-slate-600">
                      <span className="font-semibold text-slate-800">{c.category}:</span>{" "}
                      {c.text}
                      {c.sourceUrl && (
                        <a
                          href={c.sourceUrl}
                          className="ml-1 text-indigo-500 underline"
                        >
                          [{host(c.sourceUrl)}]
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {company.signals.length > 0 && (
              <Section title="Live signals">
                <ul className="flex flex-wrap gap-1.5">
                  {company.signals.slice(0, 8).map((s, i) => (
                    <li
                      key={i}
                      className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700"
                    >
                      {s.text}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          <div className="space-y-4">
            <Section title="Who to call">
              {execs.length === 0 && contacts.length === 0 && (
                <p className="text-xs text-slate-500">
                  No names on file — pull the exec org chart or add your contact on the account.
                </p>
              )}
              <ul className="space-y-1.5">
                {execs.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-slate-900">{e.name}</span>
                    <span className="text-xs text-slate-500">{e.role}</span>
                  </li>
                ))}
              </ul>
              {contacts.length > 0 && (
                <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                  {contacts.map((c) => (
                    <li key={c.id} className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-slate-900">
                        {c.champion ? "★ " : ""}
                        {c.name}
                        {c.champion ? (
                          <span className="ml-1 text-[10px] font-semibold uppercase text-amber-600">
                            champion
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-slate-500">{c.role || "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Competitive intel">
              {intel.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No rival AI tools detected in this account&rsquo;s signals.
                </p>
              ) : (
                <ul className="space-y-2">
                  {intel.map((t) => (
                    <li key={t.tool} className="text-xs">
                      <span className={`font-semibold ${t.tier === "cognition" ? "text-emerald-700" : "text-rose-700"}`}>
                        {t.tool}
                        {t.tier === "cognition" && " (Cognition)"}
                      </span>
                      <span className="block text-[11px] italic text-slate-500">{t.angle}</span>
                      {t.evidence[0] && (
                        <span className="block text-slate-600">
                          — {t.evidence[0].text}
                          {t.evidence[0].sourceUrl && (
                            <a href={t.evidence[0].sourceUrl} className="ml-1 text-sky-700 underline">
                              source
                            </a>
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="ROI math (back of envelope)">
              <p className="text-sm">
                ~{estEng.toLocaleString()} engineers × {hoursSaved}h/wk × 48wk × $
                {(avgComp / 2080).toFixed(0)}/h ≈{" "}
                <span className="font-bold text-slate-900">{fmtMoney(roi)}/yr</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {devHours.toLocaleString()} dev-hours back · estimate, not a quote
                {company.estimatedValue ? ` · deal est. ${company.estimatedValue}` : ""}
              </p>
            </Section>

            <Section title="Cadence & last touch">
              {sequence ? (
                <p className="text-sm">
                  Sequence {seqDone}/{sequence.steps.length} touches
                  {seqNext
                    ? ` · next: ${seqNext.label} (due ${seqNext.due.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
                    : " · all touches done"}
                </p>
              ) : (
                <p className="text-sm text-slate-600">No cadence running — start the 5-touch sequence from the account.</p>
              )}
              {lastTouch && (
                <p className="mt-1 text-xs text-slate-500">
                  Last activity {dt(lastTouch.ts)}: {lastTouch.text}
                </p>
              )}
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-400">
          {allSources.length > 0 && (
            <p>
              Sources: {allSources.slice(0, 10).join(" · ")}
              {allSources.length > 10 ? " · …" : ""}
            </p>
          )}
          <p>
            Generated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} by
            Apex · internal use — verify before quoting externally.
          </p>
        </div>
      </div>

      <PrintButton />
    </main>
  );
}
