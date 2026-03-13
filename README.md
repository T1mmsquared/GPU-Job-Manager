# GPU Job Manager

GPU Job Manager is an authenticated backend system for submitting, tracking, and executing asynchronous GPU model jobs.

It combines the API and persistence foundation from gpu-job-management-api with worker-side execution logic adapted from League of Doom.

## Current status

The project now has a working backend vertical slice.

Completed so far:
- Docker Compose stack for API, worker, PostgreSQL, and Redis.
- Alembic-backed database schema and migrations.
- JWT-based authentication.
- Protected job APIs.
- Job creation, listing, and detail lookup.
- Job event history endpoint.
- Result artifact endpoint.
- Simulated worker execution through Celery.
- Success lifecycle validation.
- Failure lifecycle validation with `should_fail=true`.
- Delete endpoint with ownership checks and state rules.
- Running-job delete protection (`409 Conflict`).

Validated behavior:
- A user can register and log in.
- A user can submit a job.
- The worker moves jobs from `queued` to `running` to `succeeded` or `failed`.
- `/jobs/{job_id}/events` returns lifecycle history.
- `/jobs/{job_id}/artifact` returns artifact metadata for successful jobs.
- Failed jobs do not create artifacts.
- `DELETE /jobs/{job_id}` returns `204 No Content` for succeeded and failed jobs.
- `DELETE /jobs/{job_id}` returns `409 Conflict` for running jobs.

## Implemented routes

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Jobs
- `POST /jobs`
- `GET /jobs`
- `GET /jobs/{job_id}`
- `GET /jobs/{job_id}/events`
- `GET /jobs/{job_id}/artifact`
- `DELETE /jobs/{job_id}`

### System
- `GET /health`

## Current lifecycle

Current job statuses in use:
- `queued`
- `running`
- `succeeded`
- `failed`

Planned next lifecycle states and controls:
- `cancelled`
- Job cancellation flow for running work.
- Future GPU assignment and scheduling expansion.

## What to do next

Recommended next steps, in order:
1. Add `POST /jobs/{job_id}/cancel` or a similar cancellation route.
2. Wire cancellation into the Celery worker path and persisted job events.
3. Explicitly verify cascade behavior on deleted jobs for events and artifacts.
4. Replace the simulated worker path with a more real model execution path.
5. Add a tiny demo UI for login, submission, and tracking.
6. Add clearer GPU assignment behavior beyond `gpu_id="local-sim"`.
7. Prepare deployment and architecture deliverables.

## Resume checklist

When you come back to the project, use this order:
1. Start the containers.
2. Confirm API health.
3. Register or log in.
4. Export a fresh token.
5. Submit success and failure jobs.
6. Validate lifecycle endpoints.
7. Validate delete behavior.
8. Continue with cancellation work.

## Working bash scripts

These commands are meant to be copied step by step on Ubuntu/Linux from the repo root.

### 
1) Start the stack

```bash
docker compose up -d --build
docker compose ps

2) Recreate only the API after code changes
bash
docker compose up -d --force-recreate api
docker compose ps

3) Recreate only the worker after task changes
bash
docker compose up -d --force-recreate worker
docker compose ps


## Scripts

The `scripts/` folder contains small helpers to restart the stack, log in, and run a backend smoke test.

### Prerequisites

- Docker and Docker Compose installed.
- Python 3 available on the host (for simple JSON parsing in scripts).
- `.env` configured for the API and worker as described elsewhere in this README.

### scripts/resume.sh

Restart the stack and wait for the API to come up.

```bash
./scripts/resume.sh up    # build + start all services
./scripts/resume.sh api   # recreate only the api service
./scripts/resume.sh worker  # recreate only the worker
./scripts/resume.sh all   # recreate all services


This script:

runs docker compose up with the selected mode,

prints docker compose ps,

polls http://localhost:8000/docs until the API is responding.

scripts/login.sh
Register (if needed) and log in, then print export commands for a token.

bash
./scripts/login.sh
Example usage in a new shell:

bash
eval "$(./scripts/login.sh | tail -n 4)"
This sets:

bash
export BASE_URL="http://localhost:8000"
export EMAIL="you@example.com"
export PASSWORD="Strong#Pass123"
export TOKEN="<jwt>"
scripts/smoke_test.sh
End-to-end backend smoke test using the current TOKEN:

bash
./scripts/smoke_test.sh
This script:

Submits one “success” job.

Submits one “failure” job (using should_fail=true).

Waits for both to complete.

Fetches job detail, events, and artifact for each.

Deletes both jobs and verifies they are gone.

Submits a “running” job candidate.

Attempts to delete the running job and expects 409 Conflict.

Prints recent API and worker logs.

If TOKEN is not set, the script will exit and tell you to run login.sh first.

Notes on shell scripts
All scripts are written for bash and expect LF (Unix) line endings.

If you edit scripts on Windows, ensure your editor is configured to save with LF only.

If you ever see errors like bad interpreter: Text file busy or set: pipefail, check and normalize line endings (dos2unix scripts/*.sh).


Repo Shape



gpu-job-manager/

├── app/

│   ├── main.py

│   ├── core/

│   ├── models/

│   ├── routes/

│   ├── schemas/

│   └── services/

├── worker/

│   ├── celery\_app.py

│   ├── tasks/

│   └── execution/

├── frontend/

├── alembic/

├── scripts/

├── docker-compose.yml

└── README.md


Notes
Prefer one-line commands or clean single-backslash multiline commands in Bash.

Avoid double backslashes in pasted shell commands.

Re-login after restarting or recreating services if you no longer have a valid token in your shell.

Re-register only if login says the user does not exist or the database was reset.


Near-term deliverables
Backend deliverables now mostly complete:

Auth.

Protected job APIs.

Worker execution.

Success and failure lifecycle.

Events and artifact reads.

Delete rules.


Remaining short-term deliverables:

Cancel running jobs.

Real workload execution path.

Simple demo UI.

Clearer GPU assignment flow.


Longer-term deliverables
Better scheduling and queueing.

Cloud deployment.

Architecture diagram.

Portfolio/demo polish.