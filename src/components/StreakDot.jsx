export default function StreakDot({ entry, isToday, label }) {
  const stateClass =
    isToday              ? "streak-dot--today" :
    entry?.leadDone === true  ? "streak-dot--done"  :
    entry?.leadDone === false ? "streak-dot--fail"  : "";

  const symbol =
    entry?.leadDone === true  ? "✓" :
    entry?.leadDone === false ? "✗" : "·";

  return (
    <div style={{ textAlign: "center" }}>
      <div
        className={["streak-dot", stateClass].filter(Boolean).join(" ")}
        aria-hidden="true"
      >
        {symbol}
      </div>
      <div className={`streak-day-label${isToday ? " streak-day-label--today" : ""}`}>
        {label}
      </div>
    </div>
  );
}
