import app.models  # noqa: F401

from fastapi import FastAPI

from app.routes.auth import router as auth_router
from app.routes.jobs import router as jobs_router

app = FastAPI(title="GPU Job Manager")

app.include_router(auth_router)
app.include_router(jobs_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
