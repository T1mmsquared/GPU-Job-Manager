from enum import Enum


class JobStatus(str, Enum):
    queued = "queued"
    assigned = "assigned"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"