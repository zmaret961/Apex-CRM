import Integrations from "@/components/Integrations";

export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen px-6 pb-10 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Integrations</h1>
        <p className="mt-1 text-sm text-gray-400">
          The plug-in surface — connect Apex to your CRM, prospecting, outreach, and intel stack.
        </p>
      </div>
      <Integrations />
    </div>
  );
}
