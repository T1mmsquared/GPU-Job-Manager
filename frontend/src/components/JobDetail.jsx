import StatusBadge from "./StatusBadge";

function fmt(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  } catch { return dateStr; }
}

export default function JobDetail({ job, artifact, onCancel, onDelete, actionLoading }) {
  if (!job) {
    return (
      <div className="panel">
        <div className="panel-header"><h2>Job Detail</h2></div>
        <div className="empty-state">
          <span className="empty-state__icon">??</span>
          <span>Select a job to inspect it.</span>
        </div>
      </div>
    );
  }

  const canCancel = job.status === "queued" || job.status === "running";
  const canDelete = job.status !== "running";

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Job Detail</h2>
        <StatusBadge status={job.status} />
      </div>

      <div className="detail-grid">
        <div><span className="detail-label">Job ID</span><code className="detail-value detail-code">{job.id}</code></div>
        <div><span className="detail-label">Model</span><div className="detail-value">{job.model_name}</div></div>
        <div><span className="detail-label">GPU</span><div className="detail-value">{job.gpu_id || <span style={{color:"var(--text-tertiary)"}}>pending</span>}</div></div>
        <div><span className="detail-label">Celery Task</span><code className="detail-value detail-code">{job.celery_task_id || <span style={{color:"var(--text-tertiary)"}}>pending</span>}</code></div>
        <div><span className="detail-label">Created</span><div className="detail-value">{fmt(job.created_at)}</div></div>
        <div><span className="detail-label">Updated</span><div className="detail-value">{fmt(job.updated_at)}</div></div>
      </div>

      <div className="stack">
        <div>
          <div className="section-label">Params</div>
          <pre className="json-block">{JSON.stringify(job.params, null, 2)}</pre>
        </div>
        {artifact && (
          <div>
            <div className="section-label">Artifact</div>
            <pre className="json-block">{JSON.stringify(artifact, null, 2)}</pre>
          </div>
        )}
        <div className="actions-row">
          <button className="button button--ghost" disabled={!canCancel || actionLoading} onClick={() => onCancel(job.id)}>Cancel Job</button>
          <button className="button button--danger" disabled={!canDelete || actionLoading} onClick={() => onDelete(job.id)}>Delete Job</button>
        </div>
      </div>
    </div>
  );
}
