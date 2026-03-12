import time
import uuid
from datetime import datetime, timezone

import app.models  # noqa: F401
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models.job import Job, JobStatus
from worker.celery_app import celery_app


def _db() -> Session:
    return SessionLocal()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@celery_app.task(name="run_job")
def run_job(job_id: str):
    db = _db()
    try:
        jid = uuid.UUID(job_id)
        job: Job | None = db.get(Job, jid)
        if not job:
            return

        if not job.artifacts:
            raise ValueError("Job artifacts record is missing")

        job.status = JobStatus.RUNNING.value
        job.started_at = utc_now()
        job.updated_at = utc_now()
        db.commit()
        db.refresh(job)

        payload = job.artifacts.input or {}

        if job.job_type == "test_sleep":
            seconds = int(payload.get("seconds", 5))
            seconds = max(0, min(seconds, 60))
            time.sleep(seconds)
            job.artifacts.output = {"slept_seconds": seconds}

        elif job.job_type == "validate_payload":
            required = payload.get("required_value")
            if required is None:
                raise ValueError("payload.required_value is required")
            job.artifacts.output = {
                "valid": True,
                "required_value": required,
            }

        else:
            raise ValueError(f"Unsupported job_type: {job.job_type}")

        job.status = JobStatus.SUCCEEDED.value
        job.finished_at = utc_now()
        job.updated_at = utc_now()
        job.error = None
        db.commit()

    except Exception as e:
        db.rollback()
        try:
            jid = uuid.UUID(job_id)
            job = db.get(Job, jid)
            if job:
                job.status = JobStatus.FAILED.value
                job.finished_at = utc_now()
                job.updated_at = utc_now()
                job.error = str(e)
                db.commit()
        finally:
            db.close()
        raise

    finally:
        if db.is_active:
            db.close()
