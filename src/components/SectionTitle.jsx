export default function SectionTitle({ muted, id, children }) {
  return (
    <h2
      id={id}
      className={`section-title${muted ? " section-title--muted" : ""}`}
    >
      {children}
    </h2>
  );
}
