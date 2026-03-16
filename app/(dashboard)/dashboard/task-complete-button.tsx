"use client";
import { useTransition } from "react";
import { markTaskDone } from "@/app/(dashboard)/tasks/actions";

export function TaskCompleteButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => markTaskDone(taskId))}
      disabled={isPending}
      className="size-5 rounded border border-white/[0.1] hover:border-[#C49E45]/40 hover:bg-[#C49E45]/10 transition-all flex items-center justify-center text-[10px] text-white/20 hover:text-[#C49E45] disabled:opacity-50"
      title="Mark as done"
    >
      {isPending ? "·" : ""}
    </button>
  );
}
