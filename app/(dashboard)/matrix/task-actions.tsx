"use client";
import { useTransition } from "react";
import { markTaskDone, updateTask } from "@/app/(dashboard)/tasks/actions";
import { getTodayKarachi } from "@/lib/utils";

export function TaskActions({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    startTransition(() => markTaskDone(taskId));
  }

  function handleReschedule() {
    const today = getTodayKarachi();
    const next = new Date(today);
    next.setDate(next.getDate() + 7);
    const newDate = next.toISOString().slice(0, 10);
    startTransition(() => updateTask(taskId, { dueDate: newDate }));
  }

  function handleDrop() {
    startTransition(() => updateTask(taskId, { priority: "🟢 Low" }));
  }

  return (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="px-1.5 py-0.5 text-[9px] font-mono rounded border border-[#FF6B6B]/20 text-[#FF6B6B]/60 hover:bg-[#FF6B6B]/10 hover:text-[#FF6B6B] transition-all"
        title="Complete"
      >
        ✓
      </button>
      <button
        onClick={handleReschedule}
        disabled={isPending}
        className="px-1.5 py-0.5 text-[9px] font-mono rounded border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/30 hover:bg-[#FFF8F0]/[0.05] hover:text-[#FFF8F0]/60 transition-all"
        title="Reschedule +7d"
      >
        →
      </button>
      <button
        onClick={handleDrop}
        disabled={isPending}
        className="px-1.5 py-0.5 text-[9px] font-mono rounded border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/30 hover:bg-[#FFF8F0]/[0.05] hover:text-[#FFF8F0]/60 transition-all"
        title="Drop to Q4"
      >
        ↓
      </button>
    </div>
  );
}
