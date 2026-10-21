"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="fixed bottom-6 right-6 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-indigo-500 print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
