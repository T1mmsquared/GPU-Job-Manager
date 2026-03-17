import time
import uuid

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.enums import JobStatus
from app.models.job import Job
from app.models.job_event import JobEvent
from app.models.result_artifact import ResultArtifact
from worker.celery_app import celery_app

SYNC_DATABASE_URL = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
engine = create_engine(SYNC_DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _finalize_cancelled(db, job: Job, task_id: str | None, reason: str) -> None:
    db.refresh(job)
    if job.status == JobStatus.cancelled:
        return

    job.status = JobStatus.cancelled
    db.add(
        JobEvent(
            job_id=job.id,
            event_type="cancelled",
            payload={
                "source": "worker",
                "message": reason,
                "celery_task_id": task_id,
                "gpu_id": job.gpu_id,
            },
        )
    )
    db.commit()


@celery_app.task(name="run_job", bind=True)
def run_job(self, job_id: str) -> None:
    db = SessionLocal()
    job_uuid = uuid.UUID(job_id)

    try:
        job = db.execute(
            select(Job).where(Job.id == job_uuid).with_for_update()
        ).scalar_one_or_none()

        if job is None:
            return

        if job.status == JobStatus.cancelled:
            return

        if job.cancel_requested:
            _finalize_cancelled(
                db,
                job,
                self.request.id,
                "cancelled before execution started",
            )
            return

        job.celery_task_id = self.request.id
        job.status = JobStatus.running
        job.gpu_id = "local-sim"
        db.add(
            JobEvent(
                job_id=job.id,
                event_type="running",
                payload={
                    "source": "worker",
                    "celery_task_id": self.request.id,
                    "gpu_id": job.gpu_id,
                },
            )
        )
        db.commit()

        db.refresh(job)
        if job.cancel_requested:
            _finalize_cancelled(
                db,
                job,
                self.request.id,
                "cancelled after entering running state",
            )
            return

        if (job.params or {}).get("should_fail") is True:
            raise ValueError("Simulated failure requested")

        for _ in range(5):
            time.sleep(1)
            db.refresh(job)

            if job.cancel_requested:
                _finalize_cancelled(
                    db,
                    job,
                    self.request.id,
                    "cancelled during execution",
                )
                return

        db.refresh(job)
        if job.cancel_requested:
            _finalize_cancelled(
                db,
                job,
                self.request.id,
                "cancelled before success finalization",
            )
            return

        artifact = db.execute(
            select(ResultArtifact).where(ResultArtifact.job_id == job.id)
        ).scalar_one_or_none()

        if artifact is None:
            artifact = ResultArtifact(
                job_id=job.id,
                storage_path=f"/artifacts/{job.id}/result.json",
                mime_type="application/json",
            )
            db.add(artifact)
        else:
            artifact.storage_path = f"/artifacts/{job.id}/result.json"
            artifact.mime_type = "application/json"

        job.status = JobStatus.succeeded
        db.add(
            JobEvent(
                job_id=job.id,
                event_type="succeeded",
                payload={
                    "source": "worker",
                    "message": "completed",
                    "simulated": True,
                    "storage_path": artifact.storage_path,
                    "mime_type": artifact.mime_type,
                },
            )
        )
        db.commit()

    except Exception as e:
        db.rollback()

        job = db.execute(
            select(Job).where(Job.id == job_uuid).with_for_update()
        ).scalar_one_or_none()

        if job is None:
            raise

        db.refresh(job)

        if job.status == JobStatus.cancelled:
            return

        if job.cancel_requested:
            _finalize_cancelled(
                db,
                job,
                self.request.id,
                "cancelled while handling worker exception",
            )
            return

        if job.status not in {JobStatus.succeeded, JobStatus.cancelled}:
            job.status = JobStatus.failed
            db.add(
                JobEvent(
                    job_id=job.id,
                    event_type="failed",
                    payload={
                        "source": "worker",
                        "error": str(e),
                    },
                )
            )
            db.commit()

        raise

    finally:
        db.close()
