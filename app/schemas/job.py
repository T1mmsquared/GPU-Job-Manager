from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict

from app.models.job import JobStatus

JobType = Literal["test_sleep", "validate_payload"]


class JobSubmit(BaseModel):
    job_type: JobType
    payload: dict[str, Any] = Field(default_factory=dict)


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: JobStatus
    job_type: str
    result: dict[str, Any] | None = None
    error: str | None = None
