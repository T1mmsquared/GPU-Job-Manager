import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.enums import JobStatus
from app.models.job import Job
from app.models.job_event import JobEvent
from app.models.result_artifact import ResultArtifact
from app.schemas.job import JobEventResponse, JobResponse, JobSubmit, ResultArtifactResponse
from app.models.user import User
from worker.celery_app import celery_app

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobSubmit,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> JobResponse:
    job = Job(
        owner_id=current_user.id,
        model_name=payload.model_name,
        params=payload.params,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    task = celery_app.send_task("run_job", args=[str(job.id)])
    job.celery_task_id = task.id

    db.add(
        JobEvent(
            job_id=job.id,
            event_type="queued",
            payload={
                "source": "api",
                "model_name": job.model_name,
                "celery_task_id": task.id,
            },
        )
    )

    await db.commit()
    await db.refresh(job)
    return job


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: JobStatus | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[JobResponse]:
    query = (
        select(Job)
        .where(Job.owner_id == current_user.id)
        .order_by(Job.created_at.desc())
    )

    if status is not None:
        query = query.where(Job.status == status)

    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> JobResponse:
    result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.owner_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return job


@router.get("/{job_id}/events", response_model=list[JobEventResponse])
async def get_job_events(
    job_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[JobEventResponse]:
    job_result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.owner_id == current_user.id,
        )
    )
    job = job_result.scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    result = await db.execute(
        select(JobEvent)
        .where(JobEvent.job_id == job_id)
        .order_by(JobEvent.created_at.asc())
    )
    return list(result.scalars().all())


@router.get("/{job_id}/artifact", response_model=ResultArtifactResponse)
async def get_job_artifact(
    job_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ResultArtifactResponse:
    job_result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.owner_id == current_user.id,
        )
    )
    job = job_result.scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    artifact_result = await db.execute(
        select(ResultArtifact).where(ResultArtifact.job_id == job_id)
    )
    artifact = artifact_result.scalar_one_or_none()
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found",
        )

    return artifact


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.owner_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    if job.status == JobStatus.running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Running jobs cannot be deleted",
        )

    await db.delete(job)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> JobResponse:
    result = await db.execute(
        select(Job)
        .where(
            Job.id == job_id,
            Job.owner_id == current_user.id,
        )
        .with_for_update()
    )
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    if job.status in {JobStatus.succeeded, JobStatus.failed, JobStatus.cancelled}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Job cannot be cancelled in its current state",
        )

    if job.status == JobStatus.queued:
        job.cancel_requested = True
        job.status = JobStatus.cancelled

        db.add(
            JobEvent(
                job_id=job.id,
                event_type="cancelled",
                payload={
                    "source": "api",
                    "celery_task_id": job.celery_task_id,
                    "reason": "cancelled before execution",
                },
            )
        )

        await db.commit()
        await db.refresh(job)

        if job.celery_task_id:
            celery_app.control.revoke(job.celery_task_id, terminate=False)

        return job

    if job.status == JobStatus.running:
        if not job.cancel_requested:
            job.cancel_requested = True
            db.add(
                JobEvent(
                    job_id=job.id,
                    event_type="cancel_requested",
                    payload={
                        "source": "api",
                        "celery_task_id": job.celery_task_id,
                    },
                )
            )
            await db.commit()
            await db.refresh(job)

        return job

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Job cannot be cancelled in its current state",
    )
