import clsx from "clsx";

export default function FitScore({ score }: { score: number }) {
  const tone = score >= 85 ? "text-emerald-300" : score >= 70 ? "text-accent-soft" : score >= 60 ? "text-amber-300" : "text-gray-400";
  const ring = score >= 85 ? "stroke-emerald-400" : score >= 70 ? "stroke-accent" : score >= 60 ? "stroke-amber-400" : "stroke-gray-600";
  const r = 15.9;
  const circ = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-1.5" title={`Devin fit score ${score}/100`}>
      <svg width="34" height="34" viewBox="0 0 36 36" className="-rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="stroke-white/10" />
        <circle
          cx="18" cy="18" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          className={ring}
        />
      </svg>
      <span className={clsx("text-sm font-semibold tabular-nums", tone)}>{score}</span>
    </span>
  );
}
