import FocusBoard from "@/components/FocusBoard";

export const dynamic = "force-dynamic";

export default function FocusPage() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 pb-16 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Focus</h1>
        <p className="mt-1 text-sm text-gray-400">
          Your next best actions — Apex watches every account and queues what moves pipeline
          fastest.
        </p>
      </div>
      <FocusBoard />
    </div>
  );
}
