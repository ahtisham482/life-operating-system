"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { createTask } from "./actions";

export function QuickAdd() {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const name = value.trim();
    if (!name) return;

    setValue("");
    startTransition(async () => {
      await createTask({
        taskName: name,
        status: "To Do",
        priority: "🟡 Medium",
        type: "✅ Task",
        lifeArea: null,
        dueDate: null,
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
        placeholder="Quick add task — press Enter"
        disabled={isPending}
        className="w-full h-12 px-5 bg-transparent text-sm font-serif text-[#FFF8F0]/90 placeholder:text-[#FFF8F0]/25 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 disabled:opacity-40 transition-opacity"
      />
      {isPending && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
