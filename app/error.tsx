"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Apex render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-deep max-w-md rounded-3xl p-10 text-center">
        <div className="text-4xl">⚠</div>
        <h1 className="mt-4 text-lg font-semibold text-white">
          Something broke on this page
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Your data is safe in the local SQLite database — this is a display
          error, not data loss.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="interactive rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent-soft"
          >
            Try again
          </button>
          <Link
            href="/"
            className="interactive rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300"
          >
            Back to map
          </Link>
        </div>
      </div>
    </div>
  );
}
