import { Suspense } from "react";
import MapView from "@/components/MapView";

export default function MapPage() {
  return (
    <div className="h-screen w-screen">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-gray-500">Loading map…</div>}>
        <MapView />
      </Suspense>
    </div>
  );
}
