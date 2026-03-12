# Import all models so SQLAlchemy knows about them in every process (api/worker)
from app.models.user import User  # noqa: F401
from app.models.job import Job, JobArtifact  # noqa: F401
