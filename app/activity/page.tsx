import ActivityFeed from "@/components/ActivityFeed";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Activity — Apex",
  description: "Every touch, stage move, and research run across the book.",
};

export default function ActivityPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="text-xl font-semibold text-white">Activity</h1>
      <p className="mt-1 text-sm text-gray-400">
        Everything that happened across the book — touches, stage moves, research runs, imports.
      </p>
      <div className="mt-6">
        <ActivityFeed />
      </div>
    </main>
  );
}
