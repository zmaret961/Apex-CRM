import AccountsList from "@/components/AccountsList";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  return (
    <div className="min-h-screen px-6 pb-10 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Accounts</h1>
        <p className="mt-1 text-sm text-gray-400">
          Every company with NYC engineering presence in the book.
        </p>
      </div>
      <AccountsList />
    </div>
  );
}
