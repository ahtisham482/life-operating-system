export default function Badge({ variant, children }) {
  const cls = ["badge", variant ? `badge--${variant}` : ""]
    .filter(Boolean)
    .join(" ");
  return <span className={cls}>{children}</span>;
}
