import HotLeads from "@/components/HotLeads";

export const dynamic = "force-dynamic";

export default function HotLeadsPage() {
  return (
    <div className="min-h-screen px-6 pb-10 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Hot Leads</h1>
        <p className="mt-1 text-sm text-gray-400">
          Your book, ranked by heat — fit score, buying signals, and live pipeline momentum.
        </p>
      </div>
      <HotLeads />
    </div>
  );
}
