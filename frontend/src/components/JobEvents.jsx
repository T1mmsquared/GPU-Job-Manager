function fmt(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  } catch { return dateStr; }
}

export default function JobEvents({ events, loading }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Events</h2>
        <span className="muted text-xs">{events.length} total</span>
      </div>

      {loading ? (
        <div className="stack">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{height:"48px"}} />)}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">??</span>
          <span>No events for this job yet.</span>
        </div>
      ) : (
        <div className="events-list">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-card__top">
                <span className="event-card__type">{event.event_type}</span>
                <span className="event-card__time">{fmt(event.created_at)}</span>
              </div>
              <pre className="json-block">{JSON.stringify(event.payload ?? {}, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
