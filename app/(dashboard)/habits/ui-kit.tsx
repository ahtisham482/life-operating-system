// ─────────────────────────────────────────
// Shared UI Kit — Consistent visual patterns
// for the entire habits section
// ─────────────────────────────────────────

// ─── CSS CLASS CONSTANTS ───
// Use these instead of duplicating class strings across 76 files

/** Section/form label: tiny monospace uppercase */
export const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";

/** Glass card container */
export const CARD = "bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl";

/** Standard text input */
export const INPUT =
  "w-full px-3 py-2 text-sm bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";

/** Primary action button */
export const BTN_PRIMARY =
  "px-4 py-2 text-[11px] font-mono rounded-xl bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed";

/** Secondary/ghost button */
export const BTN_SECONDARY =
  "px-4 py-2 text-[11px] font-mono rounded-xl text-[#FFF8F0]/30 border border-[#FFF8F0]/[0.06] hover:text-[#FFF8F0]/50 hover:border-[#FFF8F0]/[0.1] transition-all";

/** Green success button */
export const BTN_SUCCESS =
  "px-4 py-2 text-[11px] font-mono rounded-xl bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 hover:bg-[#34D399]/30 transition-all";

/** Subtle body text */
export const TEXT_MUTED = "text-[11px] text-[#FFF8F0]/40";

/** Stat value display */
export const STAT_VALUE = "text-lg font-mono font-bold text-[#FFF8F0]";

// ─── SHARED COMPONENTS ───

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; color: string };
  action?: { label: string; onClick: () => void };
}

/** Consistent section header with optional badge and action */
export function SectionHeader({ title, subtitle, badge, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <h3 className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
        {title}
      </h3>
      {subtitle && (
        <span className="text-[10px] font-mono text-[#FFF8F0]/20">{subtitle}</span>
      )}
      {badge && (
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: `${badge.color}20`, color: badge.color }}
        >
          {badge.label}
        </span>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="ml-auto text-[10px] font-mono text-[#FF6B6B]/60 hover:text-[#FF6B6B] transition-colors"
        >
          + {action.label}
        </button>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  compact?: boolean;
}

/** Consistent stat display card */
export function StatCard({ label, value, icon, color, trend, compact }: StatCardProps) {
  const trendColor =
    trend?.direction === "up" ? "#34D399" : trend?.direction === "down" ? "#F87171" : "#9CA3AF";

  return (
    <div className={`${CARD} ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className={compact ? "text-sm" : "text-base"}>{icon}</span>}
        <span className={LABEL}>{label}</span>
      </div>
      <p
        className={`font-mono font-bold mt-1 ${compact ? "text-base" : "text-xl"}`}
        style={{ color: color ?? "#FFF8F0" }}
      >
        {value}
      </p>
      {trend && (
        <p className="text-[10px] font-mono mt-0.5" style={{ color: trendColor }}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
        </p>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  label?: string;
  showPercent?: boolean;
  size?: "sm" | "md";
}

/** Consistent progress bar */
export function ProgressBar({
  value,
  max = 100,
  color = "#34D399",
  label,
  showPercent = true,
  size = "sm",
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-[10px] font-mono text-[#FFF8F0]/30">{label}</span>}
          {showPercent && (
            <span className="text-[10px] font-mono" style={{ color }}>
              {pct}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${height} bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface PillSelectorProps {
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
  color?: string;
  size?: "sm" | "md";
}

/** Consistent pill/toggle selector (replaces inconsistent sub-nav patterns) */
export function PillSelector({ options, selected, onSelect, color = "#FF6B6B", size = "sm" }: PillSelectorProps) {
  const padding = size === "sm" ? "px-3 py-1" : "px-4 py-1.5";
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelect(opt.key)}
          className={`${padding} ${text} font-mono rounded-lg transition-all ${
            selected === opt.key
              ? "border"
              : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50"
          }`}
          style={
            selected === opt.key
              ? { background: `${color}15`, borderColor: `${color}40`, color }
              : { borderColor: "transparent" }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

/** Consistent form field wrapper with label and optional hint */
export function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <div>
      <label className={`${LABEL} block mb-1`}>{label}</label>
      {children}
      {hint && <p className="text-[10px] text-[#FFF8F0]/20 mt-1">{hint}</p>}
    </div>
  );
}

interface ToggleChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
}

/** Selectable chip/tag for multi-select patterns */
export function ToggleChip({ label, selected, onClick, color = "#FF6B6B" }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
        selected
          ? "border-opacity-50"
          : "border-[#FFF8F0]/[0.06] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50"
      }`}
      style={
        selected
          ? { borderColor: `${color}50`, background: `${color}15`, color }
          : undefined
      }
    >
      {label}
    </button>
  );
}
