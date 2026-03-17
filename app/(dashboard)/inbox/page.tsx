import { createClient } from "@/lib/supabase/server";
import { Inbox, Check, X, Clock, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULE_META: Record<string, { label: string; icon: string; color: string }> = {
  tasks:   { label: "Tasks",    icon: "✅", color: "text-blue-400" },
  expenses:{ label: "Expenses", icon: "💰", color: "text-green-400" },
  journal: { label: "Journal",  icon: "📝", color: "text-purple-400" },
  books:   { label: "Books",    icon: "📚", color: "text-amber-400" },
  weekly:  { label: "Weekly",   icon: "📅", color: "text-cyan-400" },
  season:  { label: "Season",   icon: "🎯", color: "text-orange-400" },
  checkin: { label: "Check-In", icon: "⚡", color: "text-yellow-400" },
  habits:  { label: "Habits",   icon: "🔁", color: "text-pink-400" },
};

const STATUS_CONFIG: Record<string, { icon: typeof Check; color: string; label: string }> = {
  confirmed: { icon: Check,  color: "text-green-400", label: "Confirmed" },
  pending:   { icon: Clock,  color: "text-yellow-400", label: "Pending" },
  edited:    { icon: Edit3,  color: "text-blue-400", label: "Edited" },
  discarded: { icon: X,      color: "text-red-400", label: "Discarded" },
};

type ParsedRouteRow = {
  module: string;
  confidence: number;
  summary: string;
  data: Record<string, unknown>;
};

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: captures } = await supabase
    .from("inbox_captures")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const items = captures ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="size-11 rounded-xl bg-[#C49E45]/10 border border-[#C49E45]/20 flex items-center justify-center">
          <Inbox className="h-5 w-5 text-[#C49E45]" />
        </div>
        <div>
          <h1 className="text-lg font-serif text-[#C49E45] tracking-wide">Inbox History</h1>
          <p className="text-xs text-white/30 font-mono">All captured inputs and their routing</p>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <div className="size-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Inbox className="h-7 w-7 text-white/15" />
          </div>
          <p className="text-sm text-white/30 font-mono mb-1">No captures yet</p>
          <p className="text-xs text-white/15">
            Use the floating button or press Ctrl+K to capture your first thought
          </p>
        </div>
      )}

      {/* Capture List */}
      <div className="space-y-3">
        {items.map((capture) => {
          const statusCfg = STATUS_CONFIG[capture.status] ?? STATUS_CONFIG.pending;
          const StatusIcon = statusCfg.icon;
          const routes = (capture.parsed_result ?? []) as ParsedRouteRow[];
          const createdAt = new Date(capture.created_at);

          return (
            <div
              key={capture.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.10] transition-colors"
            >
              {/* Input + Status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm text-white/70 flex-1">{capture.raw_input}</p>
                <div className={cn("flex items-center gap-1.5 shrink-0", statusCfg.color)}>
                  <StatusIcon className="h-3 w-3" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">{statusCfg.label}</span>
                </div>
              </div>

              {/* Routed modules */}
              {routes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {routes.map((route: ParsedRouteRow, i: number) => {
                    const meta = MODULE_META[route.module] ?? { label: route.module, icon: "📦", color: "text-white/40" };
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[10px] font-mono bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5 text-white/40"
                      >
                        <span>{meta.icon}</span>
                        <span className={meta.color}>{meta.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-[10px] text-white/15 font-mono">
                {createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at{" "}
                {createdAt.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
