export default function MoodButton({ selected, children, ...rest }) {
  return (
    <button
      type="button"
      className="mood-btn"
      aria-pressed={selected}
      {...rest}
    >
      {children}
    </button>
  );
}
