const TABS = [
  { id: "daily",  label: "Daily"  },
  { id: "weekly", label: "Weekly" },
  { id: "season", label: "Season" },
  { id: "books",  label: "Books"  },
  { id: "log",    label: "Log"    },
];

export default function TabBar({ active, onChange, todayDone }) {
  return (
    <nav aria-label="Main navigation">
      <div className="tab-bar" role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            id={`tab-${id}`}
            className="tab-btn"
            role="tab"
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            onClick={() => onChange(id)}
          >
            {label}
            {id === "daily" && todayDone && (
              <span className="tab-dot" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
