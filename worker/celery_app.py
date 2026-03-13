from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "gpu_jobs",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)

import worker.tasks.tasks  # noqa: E402,F401
