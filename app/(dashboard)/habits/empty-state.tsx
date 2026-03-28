"use client";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  principle?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  principle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={`text-center ${compact ? "py-6" : "py-10"} px-4 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.05] border-dashed rounded-2xl`}
    >
      <span className={compact ? "text-3xl" : "text-4xl"}>{icon}</span>
      <h3
        className={`font-serif text-[#FFF8F0]/80 mt-3 ${compact ? "text-sm" : "text-base"}`}
      >
        {title}
      </h3>
      <p
        className={`text-[#FFF8F0]/40 mt-1.5 max-w-sm mx-auto leading-relaxed ${compact ? "text-[11px]" : "text-[12px]"}`}
      >
        {description}
      </p>

      {principle && (
        <p className="text-[10px] font-mono text-[#FEC89A]/50 mt-3 italic max-w-xs mx-auto">
          {principle}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2 text-[11px] font-mono rounded-xl bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30 transition-all"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 py-2 text-[11px] font-mono rounded-xl text-[#FFF8F0]/30 border border-[#FFF8F0]/[0.06] hover:text-[#FFF8F0]/50 hover:border-[#FFF8F0]/[0.1] transition-all"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
