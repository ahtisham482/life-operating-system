export default function Textarea({ error, className = "", ...props }) {
  const cls = ["textarea", error ? "textarea--error" : "", className]
    .filter(Boolean)
    .join(" ");
  return <textarea className={cls} {...props} />;
}
