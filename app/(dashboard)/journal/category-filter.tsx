"use client";

import { useRouter } from "next/navigation";

const CATEGORIES = [
  "General",
  "Dopamine Reset",
  "Financial",
  "Work",
  "Mindset",
  "Deen / Spiritual",
  "Health",
];

export function JournalCategoryFilter({ current }: { current: string }) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val) {
      router.push(`/journal?category=${encodeURIComponent(val)}`);
    } else {
      router.push("/journal");
    }
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="h-9 px-3 py-1 bg-transparent border border-white/[0.08] rounded-lg text-sm font-mono text-white/70 focus:outline-none focus:border-[#C49E45]/30 transition-colors cursor-pointer"
    >
      <option value="">All Categories</option>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
