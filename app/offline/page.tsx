"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1A1A2E] text-white">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-[#FF6B6B]">You&apos;re Offline</h1>
        <p className="text-lg text-white/60">
          Check your internet connection and try again.
        </p>
        <button
          onClick={() => typeof window !== "undefined" && window.location.reload()}
          className="mt-4 rounded-lg bg-[#FF6B6B] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#FF5252]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
