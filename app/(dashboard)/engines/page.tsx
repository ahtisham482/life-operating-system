export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { EngineLog } from "@/lib/db/schema";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  success: "secondary",
  warning: "default",
  error: "destructive",
};

const STATUS_ICON: Record<string, string> = {
  success: "✅",
  warning: "⚠️",
  error: "❌",
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

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          Automation
        </p>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Engine Logs
        </h1>
        <p className="text-[11px] font-mono text-white/30 tracking-wider">
          Automation engine run history &middot; {logs.length} recent logs
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

      {/* Engine Status Summary */}
      {latestByEngine.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
          {latestByEngine.map((log) => (
            <div
              key={log.engineName}
              className="glass-card rounded-2xl p-6 hover:border-white/[0.08] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-white/90">
                  {log.engineName}
                </span>
                <Badge variant={STATUS_VARIANT[log.status] ?? "secondary"}>
                  {STATUS_ICON[log.status]} {log.status}
                </Badge>
              </div>
              <p className="text-xs text-white/40 mt-2 line-clamp-2">
                {log.summary ?? "No summary"}
              </p>
              <p className="text-[10px] font-mono text-white/30 mt-1">
                Last run: {formatTimestamp(log.runAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Full Log Table */}
      {logs.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-2xl">
          <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
            No engine logs yet. Engines will run on their configured schedules.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.04]">
                <th className="px-4 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Engine
                </th>
                <th className="px-4 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                  Run At
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-white/90">
                    {log.engineName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[log.status] ?? "secondary"}>
                      {STATUS_ICON[log.status]} {log.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40 max-w-md">
                    <span className="line-clamp-2">{log.summary ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40 font-mono whitespace-nowrap">
                    {formatTimestamp(log.runAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
