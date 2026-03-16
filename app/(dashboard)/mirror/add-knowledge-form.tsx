"use client";

import { useState, useTransition } from "react";
import { addKnowledgeEntry } from "@/lib/mirror/actions";
import type { KnowledgeCategory, InputChannel } from "@/lib/mirror/types";

const CATEGORIES: { value: KnowledgeCategory; label: string; desc: string }[] = [
  { value: "identity", label: "Identity", desc: "Values, goals, beliefs, personality" },
  { value: "behavioral", label: "Behavioral", desc: "Patterns, habits, preferences" },
  { value: "contextual", label: "Contextual", desc: "Situations, environment, relationships" },
];

const SUBCATEGORIES: Record<KnowledgeCategory, string[]> = {
  identity: ["values", "goals", "beliefs", "personality", "communication_style"],
  behavioral: ["work_patterns", "habits", "preferences", "rhythms", "triggers", "avoidances"],
  contextual: ["situations", "environment", "calendar", "relationships", "finances", "health"],
};

export default function AddKnowledgeForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<KnowledgeCategory>("identity");
  const [subcategory, setSubcategory] = useState("values");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      await addKnowledgeEntry(
        category,
        subcategory,
        content.trim(),
        "explicit" as InputChannel
      );
      setContent("");
      setIsOpen(false);
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-dashed border-border/50 px-5 py-4 text-left hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground group-hover:text-primary transition-colors">
          Teach Mirror
        </p>
        <p className="text-sm font-serif text-muted-foreground/60 mt-1 group-hover:text-muted-foreground transition-colors">
          Tell it something about yourself — a value, a preference, a goal...
        </p>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-primary/20 bg-primary/[0.02] p-6 space-y-5"
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary">
        Add to Knowledge Graph
      </p>

      {/* Category selector as pill buttons */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Category
        </p>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setCategory(c.value);
                setSubcategory(SUBCATEGORIES[c.value][0]);
              }}
              className={`text-[11px] font-mono tracking-widest px-3 py-1.5 rounded border transition-colors ${
                category === c.value
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-[9px] font-mono text-muted-foreground/60">
          {CATEGORIES.find((c) => c.value === category)?.desc}
        </p>
      </div>

      {/* Subcategory */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Subcategory
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {SUBCATEGORIES[category].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubcategory(s)}
              className={`text-[10px] font-mono tracking-wider px-2.5 py-1 rounded border transition-colors ${
                subcategory === s
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground/60 hover:text-muted-foreground hover:border-border"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Content input */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          What should Mirror know?
        </p>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="e.g., I value deep work over meetings"
          className="w-full bg-background border border-border text-foreground p-3 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
          autoFocus
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="text-[11px] font-mono uppercase tracking-widest px-5 py-2.5 border border-primary text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-40"
        >
          {isPending ? "Saving..." : "Save Entry"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-[11px] font-mono uppercase tracking-widest px-5 py-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-border rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
