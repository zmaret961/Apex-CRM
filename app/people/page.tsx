import PeopleList from "@/components/PeopleList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "People — Apex",
  description: "Every saved contact across the book.",
};

export default function PeoplePage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="text-xl font-semibold text-white">People</h1>
      <p className="mt-1 text-sm text-gray-400">
        Every contact you&apos;ve saved, champions first. Click an account to open its profile.
      </p>
      <div className="mt-6">
        <PeopleList />
      </div>
    </main>
  );
}
