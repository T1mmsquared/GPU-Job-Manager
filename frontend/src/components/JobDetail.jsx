import StatusBadge from "./StatusBadge";

export default function JobDetail({
  job,
  artifact,
  onCancel,
  onDelete,
  actionLoading,
}) {
  if (!job) {
    return (
      <div className="panel">
        <h2>Job detail</h2>
        <p className="muted">Select a job to inspect it.</p>
      </div>
    );
  }

  const canCancel = job.status === "queued" || job.status === "running";
  const canDelete = job.status !== "running";

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Job detail</h2>
        <StatusBadge status={job.status} />
      </div>

      <div className="detail-grid">
        <div>
          <span className="detail-label">ID</span>
          <code className="detail-value detail-code">{job.id}</code>
        </div>
        <div>
          <span className="detail-label">Model</span>
          <div className="detail-value">{job.model_name}</div>
        </div>
        <div>
          <span className="detail-label">GPU</span>
          <div className="detail-value">{job.gpu_id || "pending"}</div>
        </div>
        <div>
          <span className="detail-label">Celery task</span>
          <div className="detail-value">{job.celery_task_id || "pending"}</div>
        </div>
        <div>
          <span className="detail-label">Created</span>
          <div className="detail-value">{job.created_at}</div>
        </div>
        <div>
          <span className="detail-label">Updated</span>
          <div className="detail-value">{job.updated_at}</div>
        </div>
      </div>

      <div className="stack">
        <div>
          <div className="detail-label">Params</div>
          <pre className="json-block">{JSON.stringify(job.params, null, 2)}</pre>
        </div>

        <div>
          <div className="detail-label">Artifact</div>
          {artifact ? (
            <pre className="json-block">{JSON.stringify(artifact, null, 2)}</pre>
          ) : (
            <p className="muted">No artifact available.</p>
          )}
        </div>

        <div className="actions-row">
          <button
            className="button button--secondary"
            disabled={!canCancel || actionLoading}
            onClick={() => onCancel(job.id)}
          >
            Cancel job
          </button>

          <button
            className="button button--danger"
            disabled={!canDelete || actionLoading}
            onClick={() => onDelete(job.id)}
          >
            Delete job
          </button>
        </div>
      </div>
    </div>
  );
}
