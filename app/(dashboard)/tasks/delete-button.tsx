"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTask } from "./actions";
import { useState } from "react";

export function DeleteTaskButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteTask(id);
  }

  return (
    <Button
      variant={confirming ? "destructive" : "ghost"}
      size="icon"
      onClick={handleDelete}
      aria-label={confirming ? "Confirm delete" : "Delete task"}
      title={confirming ? "Click again to confirm" : "Delete task"}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
