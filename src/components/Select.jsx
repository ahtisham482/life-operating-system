export default function Select({ className = "", children, ...props }) {
  const cls = ["select", className].filter(Boolean).join(" ");
  return (
    <select className={cls} {...props}>
      {children}
    </select>
  );
}
