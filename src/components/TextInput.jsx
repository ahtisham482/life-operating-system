export default function TextInput({ error, className = "", ...props }) {
  const cls = ["input", error ? "input--error" : "", className]
    .filter(Boolean)
    .join(" ");
  return <input className={cls} {...props} />;
}
