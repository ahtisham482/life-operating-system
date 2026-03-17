"use client";
import { useTransition } from "react";
import { markTaskDone } from "@/app/(dashboard)/tasks/actions";

export function TaskCompleteButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => markTaskDone(taskId))}
      disabled={isPending}
      className="size-5 rounded border border-[#FFF8F0]/[0.1] hover:border-[#FF6B6B]/40 hover:bg-[#FF6B6B]/10 transition-all flex items-center justify-center text-[10px] text-[#FFF8F0]/20 hover:text-[#FF6B6B] disabled:opacity-50"
      title="Mark as done"
    >
      {isPending ? "·" : ""}
    </button>
  );
}
