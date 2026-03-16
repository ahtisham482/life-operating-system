export default function Card({ highlight, className = "", children }) {
  const cls = [highlight ? "card--highlight" : "card", className]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}
