import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import JobStatus


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    model_name: str
    params: dict[str, Any]
    status: JobStatus
    celery_task_id: str | None
    gpu_id: str | None
    created_at: datetime
    updated_at: datetime


class JobEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    event_type: str
    payload: dict[str, Any] | None
    created_at: datetime
