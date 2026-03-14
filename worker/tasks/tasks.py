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


@celery_app.task(name="run_job", bind=True)
def run_job(self, job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.execute(
            select(Job).where(Job.id == uuid.UUID(job_id))
        ).scalar_one_or_none()
        if job is None:
            return
            
        db.refresh(job)
        if job.status == JobStatus.cancelled or job.cancel_requested:
            return    

        job.celery_task_id = self.request.id
        job.status = JobStatus.running
        job.gpu_id = "local-sim"
        db.add(
            JobEvent(
                job_id=job.id,
                event_type="running",
                payload={
                    "celery_task_id": self.request.id,
                    "gpu_id": job.gpu_id,
                },
            )
        )
        db.commit()

        if job.params.get("should_fail") is True:
            raise ValueError("Simulated failure requested")

        for _ in range(5):
            time.sleep(1)
            db.refresh(job)

            if job.cancel_requested:
                job.status = JobStatus.cancelled
                db.add(
                    JobEvent(
                        job_id=job.id,
                        event_type="cancelled",
                        payload={
                            "message": "cancelled during execution",
                            "celery_task_id": self.request.id,
                            "gpu_id": job.gpu_id,
                        },
                    )
                )
                db.commit()
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
            select(Job).where(Job.id == uuid.UUID(job_id))
        ).scalar_one_or_none()
        if job is not None:
            job.status = JobStatus.failed
            db.add(
                JobEvent(
                    job_id=job.id,
                    event_type="failed",
                    payload={"error": str(e)},
                )
            )
            db.commit()
        raise
    finally:
        db.close()
