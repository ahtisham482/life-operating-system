export default function Toast({ message }) {
  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{ opacity: message ? 1 : 0 }}
    >
      {message}
    </div>
  );
}
