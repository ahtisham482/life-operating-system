"use client";

import { useState, useTransition } from "react";
import { addCustomBook, deleteCustomBook } from "./actions";

type CustomBook = {
  id: string;
  title: string;
  status: string;
  insight: string | null;
};

export function CustomLibrary({ books }: { books: CustomBook[] }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Currently Reading");
  const [insight, setInsight] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!title.trim()) return;
    startTransition(async () => {
      await addCustomBook(title.trim(), status, insight.trim());
      setTitle("");
      setInsight("");
      setStatus("Currently Reading");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCustomBook(id);
    });
  }

  return (
    <div className={`space-y-4 ${isPending ? "opacity-60" : ""}`}>
      {/* Add Book Form */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
          Add a Book
        </p>
        <div className="bg-card border border-border p-5 rounded-lg space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Book title"
            className="w-full bg-background border border-border text-foreground p-2.5 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-background border border-border text-foreground p-2.5 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="Currently Reading">Currently Reading</option>
            <option value="Finished">Finished</option>
            <option value="Up Next">Up Next</option>
          </select>
          <input
            value={insight}
            onChange={(e) => setInsight(e.target.value)}
            placeholder="Key insight or implementation note"
            className="w-full bg-background border border-border text-foreground p-2.5 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleAdd}
            disabled={!title.trim() || isPending}
            className="px-6 py-2.5 text-[11px] font-mono uppercase tracking-widest border border-primary text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-40"
          >
            Add Book
          </button>
        </div>
      </div>

      {/* Library List */}
      {books.length > 0 && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Your Library
          </p>
          <div className="space-y-3">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-card border border-border p-4 rounded-lg flex justify-between items-start"
              >
                <div>
                  <p className="text-sm font-serif text-foreground mb-1">
                    {book.title}
                  </p>
                  {book.insight && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {book.insight}
                    </p>
                  )}
                  <p
                    className={`text-[10px] font-mono tracking-widest mt-1 ${
                      book.status === "Finished"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {book.status.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(book.id)}
                  className="text-xs font-mono px-2 py-1 border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors shrink-0 ml-3"
                >
                  ✗
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
