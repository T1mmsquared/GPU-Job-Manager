export default function StatusBadge({ status }) {
  const normalized = status || "unknown";

  return (
    <span className={`status-badge status-badge--${normalized}`}>
      {normalized}
    </span>
  );
}
