export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Inbox, Check, X, Clock } from "lucide-react";
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
  success: { icon: Check, color: "text-green-400", label: "Confirmed" },
  warning: { icon: Clock, color: "text-yellow-400", label: "Pending" },
  error:   { icon: X,     color: "text-red-400", label: "Discarded" },
};

type ParsedRouteRow = {
  module: string;
  confidence: number;
  summary: string;
  data: Record<string, unknown>;
};

type CaptureDetails = {
  parsed_result?: ParsedRouteRow[];
  capture_status?: string;
};

export default async function InboxPage() {
  let items: Record<string, unknown>[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("engine_logs")
      .select("*")
      .eq("engine_name", "inbox_capture")
      .order("run_at", { ascending: false })
      .limit(50);
    items = data ?? [];
  } catch {
    // DB query failed — show empty state gracefully
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="size-11 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 flex items-center justify-center">
          <Inbox className="h-5 w-5 text-[#FF6B6B]" />
        </div>
        <div>
          <h1 className="text-lg font-serif text-[#FF6B6B] tracking-wide">Inbox History</h1>
          <p className="text-xs text-[#FFF8F0]/30 font-mono">All captured inputs and their routing</p>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <div className="size-16 rounded-2xl bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] flex items-center justify-center mx-auto mb-4">
            <Inbox className="h-7 w-7 text-[#FFF8F0]/15" />
          </div>
          <p className="text-sm text-[#FFF8F0]/30 font-mono mb-1">No captures yet</p>
          <p className="text-xs text-[#FFF8F0]/15">
            Use the floating button or press Ctrl+K to capture your first thought
          </p>
        </div>
      )}

      {/* Capture List */}
      <div className="space-y-3">
        {items.map((capture) => {
          const statusCfg = STATUS_CONFIG[capture.status as string] ?? STATUS_CONFIG.warning;
          const StatusIcon = statusCfg.icon;
          const details = ((capture.details ?? {}) as CaptureDetails);
          const routes = details.parsed_result ?? [];
          const createdAt = new Date(capture.run_at as string);

          return (
            <div
              key={capture.id as string}
              className="bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.06] rounded-xl p-4 hover:border-[#FFF8F0]/[0.10] transition-colors"
            >
              {/* Input + Status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm text-[#FFF8F0]/70 flex-1">{capture.summary as string}</p>
                <div className={cn("flex items-center gap-1.5 shrink-0", statusCfg.color)}>
                  <StatusIcon className="h-3 w-3" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">{statusCfg.label}</span>
                </div>
              </div>

              {/* Routed modules */}
              {routes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {routes.map((route: ParsedRouteRow, i: number) => {
                    const meta = MODULE_META[route.module] ?? { label: route.module, icon: "📦", color: "text-[#FFF8F0]/40" };
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#FFF8F0]/[0.04] border border-[#FFF8F0]/[0.06] rounded-md px-2 py-0.5 text-[#FFF8F0]/40"
                      >
                        <span>{meta.icon}</span>
                        <span className={meta.color}>{meta.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-[10px] text-[#FFF8F0]/15 font-mono">
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
