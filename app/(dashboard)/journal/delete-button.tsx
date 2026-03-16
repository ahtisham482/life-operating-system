"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteJournalEntry } from "./actions";
import { useState } from "react";

export function DeleteJournalButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteJournalEntry(id);
  }

  return (
    <Button
      variant={confirming ? "destructive" : "ghost"}
      size="icon"
      onClick={handleDelete}
      aria-label={confirming ? "Confirm delete" : "Delete journal entry"}
      title={confirming ? "Click again to confirm" : "Delete journal entry"}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
