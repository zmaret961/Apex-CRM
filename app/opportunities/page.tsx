import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default function OpportunitiesPage() {
  return (
    <div className="min-h-screen px-6 pb-10 pt-24">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Opportunities</h1>
          <p className="mt-1 text-sm text-gray-400">
            Drag cards between stages. Customers sit in Closed Won.
          </p>
        </div>
      </div>
      <KanbanBoard />
    </div>
  );
}
