import uuid
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.job import Job, JobArtifact, JobStatus


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_job(db: Session, user_id, job_type: str, payload: dict) -> Job:
    job = Job(
        status=JobStatus.QUEUED.value,
        job_type=job_type,
        user_id=user_id,
        updated_at=utc_now(),
    )
    artifact = JobArtifact(job=job, input=payload, meta={})
    db.add(job)
    db.add(artifact)
    db.commit()
    db.refresh(job)
    return job


def list_jobs(db: Session, user_id, limit: int, offset: int, status: str | None):
    stmt = select(Job).where(Job.user_id == user_id)

    if status:
        stmt = stmt.where(Job.status == status)

    stmt = stmt.order_by(desc(Job.created_at)).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


def get_job(db: Session, job_id: uuid.UUID) -> Job | None:
    return db.get(Job, job_id)


def delete_job(db: Session, job: Job) -> bool:
    deletable_statuses = {
        JobStatus.QUEUED.value,
        JobStatus.SUCCEEDED.value,
        JobStatus.FAILED.value,
        JobStatus.CANCELLED.value,
    }

    if job.status not in deletable_statuses:
        return False

    db.delete(job)
    db.commit()
    return True
