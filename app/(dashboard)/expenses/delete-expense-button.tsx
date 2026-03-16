"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "./actions";
import { useState } from "react";

export function DeleteExpenseButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteExpense(id);
  }

  return (
    <Button
      variant={confirming ? "destructive" : "ghost"}
      size="icon"
      onClick={handleDelete}
      aria-label={confirming ? "Confirm delete" : "Delete expense"}
      title={confirming ? "Click again to confirm" : "Delete expense"}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
