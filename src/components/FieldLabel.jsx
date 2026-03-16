export default function FieldLabel({ htmlFor, id, children }) {
  return (
    <label className="field-label" htmlFor={htmlFor} id={id}>
      {children}
    </label>
  );
}
