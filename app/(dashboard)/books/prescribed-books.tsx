"use client";

import { useTransition } from "react";
import { cyclePrescribedBookStatus } from "./actions";

type PrescribedBook = {
  id: string;
  title: string;
  author: string;
  status: string;
  sortOrder: number;
};

export function PrescribedBooks({ books }: { books: PrescribedBook[] }) {
  const [isPending, startTransition] = useTransition();

  function handleCycle(book: PrescribedBook) {
    startTransition(async () => {
      await cyclePrescribedBookStatus(book.id, book.status);
    });
  }

  return (
    <div className="bg-card border border-border p-5 rounded-lg">
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">
        Prescribed Reading Order — From Your Diagnosis
      </p>
      <p className="text-[10px] font-mono text-muted-foreground/40 mb-4">
        Click a book to cycle: unread → reading → done
      </p>

      <div className={isPending ? "opacity-60" : ""}>
        {books.map((book) => {
          const isDone = book.status === "done";
          const isReading = book.status === "reading";

          return (
            <div
              key={book.id}
              onClick={() => handleCycle(book)}
              className="flex items-center gap-3 py-2 border-b border-border/30 last:border-b-0 cursor-pointer hover:bg-secondary/20 transition-colors"
            >
              <span
                className={`text-[10px] font-mono w-6 text-right ${
                  isDone ? "text-primary" : "text-muted-foreground/30"
                }`}
              >
                {book.sortOrder}.
              </span>
              <span
                className={`flex-1 text-[13px] font-serif ${
                  isDone
                    ? "text-primary"
                    : isReading
                    ? "text-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                {book.title} — {book.author}
              </span>
              <span
                className={`text-[9px] font-mono min-w-[50px] text-right ${
                  isDone
                    ? "text-primary"
                    : isReading
                    ? "text-muted-foreground"
                    : "text-muted-foreground/30"
                }`}
              >
                {isDone ? "DONE ✓" : isReading ? "READING" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
