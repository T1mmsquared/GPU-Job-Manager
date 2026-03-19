import StatusBadge from "./StatusBadge";

function canCancel(status) {
  return status === "queued" || status === "running";
}

function canDelete(status) {
  return status !== "running";
}

export default function JobList({
  jobs,
  selectedJobId,
  onSelect,
  onCancel,
  onDelete,
  actionLoadingId,
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Jobs</h2>
        <span className="muted">{jobs.length} total</span>
      </div>

      {jobs.length === 0 ? (
        <p className="muted">No jobs yet.</p>
      ) : (
        <div className="job-list">
          {jobs.map((job) => {
            const active = job.id === selectedJobId;
            const busy = actionLoadingId === job.id;

            return (
              <div
                key={job.id}
                role="button"
                tabIndex={0}
                className={`job-card ${active ? "job-card--active" : ""}`}
                onClick={() => onSelect(job.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(job.id);
                  }
                }}
              >
                <div className="job-card__top">
                  <div>
                    <div className="job-card__title">{job.model_name}</div>
                    <div className="job-card__id">{job.id}</div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                <div className="job-card__meta">
                  <span>GPU: {job.gpu_id || "pending"}</span>
                  <span>
                    Cancel requested: {job.cancel_requested ? "yes" : "no"}
                  </span>
                </div>

                <div className="job-card__actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={!canCancel(job.status) || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(job.id);
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="button button--danger"
                    disabled={!canDelete(job.status) || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(job.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
