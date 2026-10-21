import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-deep max-w-md rounded-3xl p-10 text-center">
        <div className="text-4xl">◌</div>
        <h1 className="mt-4 text-lg font-semibold text-white">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Apex has the Map, Focus, Hot Leads, Accounts, Opportunities, Research,
          Automation, and Integrations pages — press ⌘K to jump to one.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="interactive rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent-soft"
          >
            Back to map
          </Link>
        </div>
      </div>
    </div>
  );
}
