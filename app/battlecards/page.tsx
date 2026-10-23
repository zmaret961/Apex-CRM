import { intelSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Battlecards: the whole competitive surface in one place — every AI coding
// tool that shows up anywhere in the book, its tier (Cognition product vs
// rival), its talk track, and the accounts where intel detected it.
export default function BattlecardsPage() {
  const { tools, competitorClaims } = intelSummary();
  const surface = tools.filter((t) => t.mentions > 0);
  const quiet = tools.filter((t) => t.mentions === 0);

  return (
    <div className="min-h-screen px-6 pb-10 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Battlecards</h1>
        <p className="mt-1 text-sm text-gray-400">
          Every rival tool detected in the book&rsquo;s research and signals — what it is,
          how to position Devin, and which accounts it showed up in.
        </p>
      </div>

      {surface.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-gray-500">
          No competitive intel yet — run a research sweep on Automation to populate this page.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {surface.map((t) => (
            <div
              key={t.tool}
              className={`glass rounded-2xl p-5 ${
                t.tier === "cognition" ? "border-emerald-400/25" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <a
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`text-lg font-semibold hover:underline ${
                    t.tier === "cognition" ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {t.tool} ↗
                </a>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                    t.tier === "cognition"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-300"
                  }`}
                >
                  {t.tier === "cognition" ? "Cognition product" : "Rival"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">{t.angle}</p>
              <div className="mt-3 flex items-baseline gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-400">
                  {t.mentions} mention{t.mentions === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>
                  {t.accounts.length} account{t.accounts.length === 1 ? "" : "s"}
                </span>
              </div>
              {t.accounts.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {t.accounts.slice(0, 12).map((a) => (
                    <a
                      key={a.id}
                      href={`/accounts?open=${a.id}`}
                      title={`Open ${a.name}`}
                      className="interactive rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400 hover:border-accent/40 hover:text-white"
                    >
                      {a.name}
                    </a>
                  ))}
                  {t.accounts.length > 12 && (
                    <span className="px-1.5 py-0.5 text-[11px] text-gray-600">
                      +{t.accounts.length - 12} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {quiet.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            On the radar, not yet detected in your book
          </h2>
          <div className="flex flex-wrap gap-2">
            {quiet.map((t) => (
              <span
                key={t.tool}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-500"
              >
                {t.tool}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-gray-600">
        {competitorClaims} competitive claims tracked across the book · intel updates on every research sweep
      </p>
    </div>
  );
}
