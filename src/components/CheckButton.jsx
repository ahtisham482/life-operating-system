/**
 * CheckButton — yes/no/unanswered state button for daily lead check-in.
 * value: true = yes (gold), false = no (error), null = unanswered (neutral)
 */
export default function CheckButton({ value, children, ...rest }) {
  const stateClass =
    value === true ? "check-btn--yes" :
    value === false ? "check-btn--no" :
    "check-btn--null";

  return (
    <button
      type="button"
      className={`check-btn ${stateClass}`}
      aria-pressed={value === null || value === undefined ? undefined : value}
      {...rest}
    >
      {children}
    </button>
  );
}
