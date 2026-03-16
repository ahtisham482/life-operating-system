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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
          ⚙️ Engine Logs
        </h1>
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          Automation engine run history · {logs.length} recent logs
        </p>
      </div>

      {/* Engine Status Summary */}
      {latestByEngine.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {latestByEngine.map((log) => (
            <div
              key={log.engineName}
              className="border border-border/50 rounded-lg p-4 bg-card/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-foreground">
                  {log.engineName}
                </span>
                <Badge variant={STATUS_VARIANT[log.status] ?? "secondary"}>
                  {STATUS_ICON[log.status]} {log.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {log.summary ?? "No summary"}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                Last run: {formatTimestamp(log.runAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Full Log Table */}
      {logs.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground font-mono text-sm border border-border/30 rounded-lg">
          No engine logs yet. Engines will run on their configured schedules.
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card border-b border-border/50">
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Engine
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Run At
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  className={`border-t border-border/30 ${i % 2 !== 0 ? "bg-card/20" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    {log.engineName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[log.status] ?? "secondary"}>
                      {STATUS_ICON[log.status]} {log.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-md">
                    <span className="line-clamp-2">{log.summary ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
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
