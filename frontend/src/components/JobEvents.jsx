export default function JobEvents({ events, loading }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Events</h2>
        <span className="muted">{events.length} total</span>
      </div>

      {loading ? (
        <p className="muted">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="muted">No events for this job.</p>
      ) : (
        <div className="events-list">
          {events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-card__top">
                <strong>{event.event_type}</strong>
                <span className="muted">{event.created_at}</span>
              </div>

              <pre className="json-block">
                {JSON.stringify(event.payload ?? {}, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
