import AutomationConsole from "@/components/AutomationConsole";

export const dynamic = "force-dynamic";

export default function AutomationPage() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 pb-16 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Automation Console</h1>
        <p className="mt-1 text-sm text-gray-400">
          The research agent sweeps unresearched and stale accounts, publishes cited briefs, and surfaces competitor intel.
        </p>
      </div>
      <AutomationConsole />
    </div>
  );
}
