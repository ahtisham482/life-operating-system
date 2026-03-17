"use client";

import { useRef, useEffect, useState, useTransition, useMemo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { createTask } from "./actions";
import { parseNaturalDate } from "@/lib/parse-date";

export function QuickAdd() {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Parse NLP date as user types
  const parsed = useMemo(() => {
    if (!value.trim()) return null;
    return parseNaturalDate(value);
  }, [value]);

  const parsedDate = parsed?.parsedDate ?? null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const raw = value.trim();
    if (!raw) return;

    // Parse NLP date from input
    const result = parseNaturalDate(raw);
    const taskName = result.taskName || raw;
    const dueDate = result.parsedDate?.date ?? null;

    setValue("");
    startTransition(async () => {
      await createTask({
        taskName,
        status: "To Do",
        priority: "🟡 Medium",
        type: "✅ Task",
        lifeArea: null,
        dueDate,
        notes: null,
        recurring: false,
        frequency: null,
        repeatEveryDays: null,
      });
    });
  }

  return (
    <div className="glass-card rounded-xl relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Quick add — try 'Buy milk tomorrow'"
        disabled={isPending}
        className="w-full h-12 px-5 bg-transparent text-sm font-serif text-[#FFF8F0]/90 placeholder:text-[#FFF8F0]/25 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 disabled:opacity-40 transition-opacity"
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {parsedDate && !isPending && (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#FF6B6B]/60 bg-[#FF6B6B]/[0.08] px-2 py-0.5 rounded-full">
            <CalendarIcon className="w-2.5 h-2.5" />
            {parsedDate.label}
          </span>
        )}
        {isPending && (
          <div className="w-4 h-4 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
