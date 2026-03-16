export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import type { EngineLog } from "@/lib/db/schema";

const ENGINE_DESCRIPTIONS: Record<string, string> = {
  "recurring-tasks": "Creates your daily recurring tasks automatically",
  "Recurring Task Extractor": "Creates your daily recurring tasks automatically",
  "watchdog": "Alerts you when tasks are stuck for 5+ days",
  "Workspace Watchdog": "Alerts you when tasks are stuck for 5+ days",
};

export default async function EngineLogsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("engine_logs")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(50);

  const logs = (rows || []).map((r) => fromDb<EngineLog>(r));

  // Group by engine name for summary
  const engineNames = [...new Set(logs.map((l) => l.engineName))];
  const latestByEngine = engineNames.map((name) => logs.find((l) => l.engineName === name)!);

  // Check if any engine has errors
  const hasError = latestByEngine.some((log) => log.status === "error");

  // Recent activity — last 10 runs
  const recentActivity = logs.slice(0, 10);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Automations
        </h1>
        <p className="text-sm font-serif text-white/50">
          Your automated systems working in the background.
        </p>
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${hasError ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.4)]" : "bg-green-400/80 shadow-[0_0_6px_rgba(74,222,128,0.3)]"}`} />
          <span className="text-[11px] font-mono text-white/40 tracking-wider">
            {hasError ? "Attention needed" : "All systems running normally"}
          </span>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-4" />
      </div>

      {/* Engine Cards */}
      {latestByEngine.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: "0.06s", animationFillMode: "both" }}>
          {latestByEngine.map((log) => {
            const isError = log.status === "error";
            return (
              <div
                key={log.engineName}
                className={`glass-card rounded-2xl p-6 border-l-2 ${
                  isError ? "border-l-red-500/50" : "border-l-green-500/50"
                }`}
              >
                <h3 className="text-lg font-serif text-white/90 mb-1">
                  {log.engineName}
                </h3>
                <p className="text-[11px] font-mono text-white/30 tracking-wider mb-4">
                  {ENGINE_DESCRIPTIONS[log.engineName] ?? "Automated system process"}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`size-1.5 rounded-full ${isError ? "bg-red-400" : "bg-green-400/80"}`} />
                  <span className={`text-[11px] font-mono tracking-wider ${isError ? "text-red-400" : "text-green-400/80"}`}>
                    {isError ? "Error" : "Running"}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-white/25">
                  Last run: {formatTimestamp(log.runAt)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center glass-card rounded-2xl animate-slide-up" style={{ animationDelay: "0.06s", animationFillMode: "both" }}>
          <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
            No engine logs yet. Engines will run on their configured schedules.
          </p>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section className="space-y-4 animate-slide-up" style={{ animationDelay: "0.12s", animationFillMode: "both" }}>
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#C49E45]/60">
            Recent Activity
          </h2>
          <div className="space-y-1">
            {recentActivity.map((log) => {
              const isSuccess = log.status === "success";
              const isError = log.status === "error";
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 py-2 px-1"
                >
                  <span className={`text-xs font-mono ${isError ? "text-red-400" : isSuccess ? "text-green-400/70" : "text-yellow-500/70"}`}>
                    {isError ? "\u2717" : "\u2713"}
                  </span>
                  <span className="text-[11px] font-mono text-white/40 tracking-wider">
                    {formatTimestamp(log.runAt)}
                  </span>
                  <span className="text-[11px] font-mono text-white/25">
                    &middot;
                  </span>
                  <span className="text-[11px] font-mono text-white/40 tracking-wider">
                    {log.engineName}
                  </span>
                  <span className="text-[11px] font-mono text-white/25">
                    &middot;
                  </span>
                  <span className="text-[11px] font-mono text-white/30 truncate flex-1 min-w-0">
                    {log.summary ?? "\u2014"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function formatTimestamp(ts: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ts));
}
