"use client";

export default function HabitsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h2 className="text-2xl font-serif text-[#FF6B6B] mb-4">
        Something went wrong
      </h2>
      <p className="text-sm text-[#FFF8F0]/50 mb-2 max-w-md">
        {error.message || "An unexpected error occurred loading the habits page."}
      </p>
      {error.digest && (
        <p className="text-xs text-[#FFF8F0]/30 font-mono mb-6">
          Digest: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-[#FF6B6B] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#FF5252]"
      >
        Try again
      </button>
    </div>
  );
}
