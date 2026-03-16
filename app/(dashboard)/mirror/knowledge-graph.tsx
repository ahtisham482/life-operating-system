"use client";

import { useTransition } from "react";
import type { KnowledgeEntry } from "@/lib/mirror/types";
import {
  deleteKnowledgeEntry,
  reinforceKnowledge,
  contradictKnowledge,
} from "@/lib/mirror/actions";

export default function KnowledgeGraph({
  entries,
}: {
  entries: KnowledgeEntry[];
}) {
  const identity = entries.filter((e) => e.category === "identity");
  const behavioral = entries.filter((e) => e.category === "behavioral");
  const contextual = entries.filter((e) => e.category === "contextual");

  if (entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-mono uppercase tracking-widest text-primary">
        Knowledge Graph
      </h2>

      <div className="grid md:grid-cols-3 gap-4">
        <CategoryColumn
          title="Identity"
          description="Values, goals, beliefs"
          entries={identity}
          accentClass="border-primary/30"
          headerClass="bg-primary/[0.04] border-b border-primary/20"
          labelClass="text-primary"
        />
        <CategoryColumn
          title="Behavioral"
          description="Patterns, habits, rhythms"
          entries={behavioral}
          accentClass="border-blue-500/30"
          headerClass="bg-blue-500/[0.04] border-b border-blue-500/20"
          labelClass="text-blue-400"
        />
        <CategoryColumn
          title="Contextual"
          description="Situations, environment"
          entries={contextual}
          accentClass="border-emerald-500/30"
          headerClass="bg-emerald-500/[0.04] border-b border-emerald-500/20"
          labelClass="text-emerald-400"
        />
      </div>
    </section>
  );
}

function CategoryColumn({
  title,
  description,
  entries,
  accentClass,
  headerClass,
  labelClass,
}: {
  title: string;
  description: string;
  entries: KnowledgeEntry[];
  accentClass: string;
  headerClass: string;
  labelClass: string;
}) {
  return (
    <div className={`rounded-lg border ${accentClass} overflow-hidden`}>
      <div className={`px-4 py-3 ${headerClass}`}>
        <div className="flex items-center justify-between">
          <p className={`text-[10px] font-mono uppercase tracking-[0.25em] ${labelClass}`}>
            {title}
          </p>
          <span className="text-[9px] font-mono text-muted-foreground">
            {entries.length}
          </span>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
      <div className="divide-y divide-border/20">
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
              No entries yet
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} labelClass={labelClass} />
          ))
        )}
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  labelClass,
}: {
  entry: KnowledgeEntry;
  labelClass: string;
}) {
  const [isPending, startTransition] = useTransition();

  const pct = Math.round(entry.confidence * 100);
  const barColor =
    pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-yellow-500/70" : "bg-red-500/50";

  const temporalLabel = {
    permanent: "PERM",
    seasonal: "SEAS",
    temporary: "TEMP",
    uncertain: "UNCRT",
  }[entry.temporalClass];

  function handleReinforce() {
    startTransition(() => reinforceKnowledge(entry.id));
  }

  function handleContradict() {
    startTransition(() => contradictKnowledge(entry.id));
  }

  function handleDelete() {
    startTransition(() => deleteKnowledgeEntry(entry.id));
  }

  return (
    <div className={`px-4 py-3 space-y-2 ${isPending ? "opacity-40" : ""}`}>
      {/* Content */}
      <p className="text-sm font-serif text-foreground leading-relaxed">
        {entry.content}
      </p>

      {/* Confidence bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-border/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] font-mono text-muted-foreground w-7 text-right">
          {pct}%
        </span>
      </div>

      {/* Metadata row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">
            {entry.subcategory.replace(/_/g, " ")}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/30">
            /
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">
            {temporalLabel}
          </span>
          {entry.reinforcementCount > 0 && (
            <span className="text-[9px] font-mono text-primary/60">
              +{entry.reinforcementCount}
            </span>
          )}
          {entry.contradictionCount > 0 && (
            <span className="text-[9px] font-mono text-red-400/60">
              -{entry.contradictionCount}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-0.5">
          <button
            onClick={handleReinforce}
            disabled={isPending}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors"
            title="Confirm — this is accurate"
          >
            CONFIRM
          </button>
          <button
            onClick={handleContradict}
            disabled={isPending}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded text-yellow-500/50 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
            title="Dispute — this is inaccurate"
          >
            DISPUTE
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Remove this entry"
          >
            REMOVE
          </button>
        </div>
      </div>
    </div>
  );
}
