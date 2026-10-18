import { listBriefs } from "@/lib/queries";
import ResearchFeed from "@/components/ResearchFeed";

export const dynamic = "force-dynamic";

export default function ResearchPage() {
  const briefs = listBriefs(60);
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 pb-16 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Research</h1>
        <p className="mt-1 text-sm text-gray-400">
          Agent-produced briefs. Every claim links to its source.
        </p>
      </div>
      <ResearchFeed initialBriefs={briefs} />
    </div>
  );
}
