# GPU Job Manager

GPU Job Manager is an authenticated backend system for submitting, tracking, and executing asynchronous GPU model jobs.

It combines the API and persistence foundation from `gpu-job-management-api` with worker-side execution logic adapted from League of Doom.

## Current status

The project now has a working backend vertical slice, plus cooperative cancellation support.

### Completed so far

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
- Job cancellation route.
- Queued-job cancellation.
- Running-job cooperative cancellation.
- Cancellation event history.
- Restart-safe queued cancellation guard in the worker.

### Validated behavior

- A user can register and log in.
- A user can submit a job.
- The worker moves jobs from `queued` to `running` to `succeeded` or `failed`.
- `/jobs/{job_id}/events` returns lifecycle history.
- `/jobs/{job_id}/artifact` returns artifact metadata for successful jobs.
- Failed jobs do not create artifacts.
- `DELETE /jobs/{job_id}` returns `204 No Content` for succeeded and failed jobs.
- `DELETE /jobs/{job_id}` returns `409 Conflict` for running jobs.
- `POST /jobs/{job_id}/cancel` cancels queued jobs before execution.
- `POST /jobs/{job_id}/cancel` requests cancellation for running jobs and the worker transitions them to `cancelled`.
- Cancelled jobs do not create artifacts.
- Cancelling a terminal job returns `409 Conflict`.

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
- `POST /jobs/{job_id}/cancel`
- `DELETE /jobs/{job_id}`

### System

- `GET /health`

## Current lifecycle

Current job statuses in use:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

### Current cancellation behavior

- Queued jobs can be cancelled immediately.
- Running jobs are cancelled cooperatively by the worker.
- `cancel_requested` is persisted so the worker can stop safely.
- The worker checks cancellation state before starting execution and during the simulated run loop.

## What to do next

Recommended next steps, in order:

1. Explicitly verify cascade behavior on deleted jobs for events and artifacts.
2. Replace the simulated worker path with a more real model execution path.
3. Finish the tiny demo UI for login, submission, and tracking.
4. Add clearer GPU assignment behavior beyond `gpu_id="local-sim"`.
5. Add list filtering and pagination polish where useful.
6. Prepare deployment and architecture deliverables.
7. Address the Celery container user warning cleanly.

## Resume checklist

When you come back to the project, use this order:

1. Start the containers.
2. Confirm API health.
3. Register or log in.
4. Export a fresh token.
5. Run the smoke test.
6. Review logs if anything fails.
7. Continue with the next planned feature.

## Working bash scripts

These commands are meant to be copied step by step on Ubuntu/Linux from the repo root.

### 1) Start the stack

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
The scripts/ folder contains small helpers to restart the stack, log in, and run a backend smoke test.

Prerequisites
-Docker and Docker Compose installed.
-Python 3 available on the host for simple JSON parsing in scripts.
-.env configured for the API and worker.

scripts/resume.sh
Restart the stack and wait for the API to come up.

./scripts/resume.sh up
./scripts/resume.sh api
./scripts/resume.sh worker
./scripts/resume.sh all

This script:

Runs docker compose up with the selected mode.

Prints docker compose ps.

Polls http://localhost:8000/docs until the API is responding.

scripts/login.sh
Register if needed and log in, then print export commands for a token.

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
End-to-end backend smoke test using the current TOKEN.

bash
./scripts/smoke_test.sh

This script:

-Submits one success job.
-Submits one failure job using should_fail=true.
-Waits for both to complete.
-Fetches job detail, events, and artifact for each.
-Deletes the success and failure jobs and verifies they are gone.
-Submits a running-job candidate and verifies delete returns 409 Conflict.
-Tests queued cancellation by stopping the worker, cancelling the queued job, restarting the worker, and verifying the job stays cancelled.
-Tests running cancellation and verifies the job becomes cancelled.
-Verifies cancelling a terminal job returns 409 Conflict.
-Prints recent API and worker logs.

If TOKEN is not set, the script exits and tells you to run login.sh first.

Notes on shell scripts
-All scripts are written for bash and expect LF Unix line endings.
-If you edit scripts on Windows, ensure your editor saves with LF only.
-If you see errors like bad interpreter: Text file busy or set: pipefail, normalize line endings with dos2unix scripts/*.sh.

Repo shape

GPU-Job-Manager/
├── alembic/
│   ├── env.py
│   ├── README
│   ├── script.py.mako
│   └── versions/
│       ├── 20260312_01_day2_auth_and_jobs.py
│       └── 9e55a9916183_add_cancel_requested_to_jobs.py
├── alembic.ini
├── app/
│   ├── core/
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── deps.py
│   │   └── security.py
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   │   ├── enums.py
│   │   ├── gpu_assignment.py
│   │   ├── __init__.py
│   │   ├── job_event.py
│   │   ├── job.py
│   │   ├── result_artifact.py
│   │   └── user.py
│   ├── routes/
│   │   ├── auth.py
│   │   └── jobs.py
│   ├── schemas/
│   │   ├── auth.py
│   │   └── job.py
│   └── services/
│       ├── jobs.py
│       └── password_policy.py
├── docker-compose.yml
├── Dockerfile
├── frontend/
├── README.md
├── requirements.txt
├── scripts/
│   ├── login.sh
│   ├── resume.sh
│   └── smoke_test.sh
└── worker/
    ├── celery_app.py
    ├── execution/
    │   ├── __init__.py
    │   ├── main.py
    │   ├── planner_agent.py
    │   ├── research_agent.py
    │   └── routing/
    │       ├── agent_graph.py
    │       └── __init__.py
    ├── __init__.py
    └── tasks/
        ├── __init__.py
        └── tasks.py


Notes
-Prefer one-line commands or clean single-backslash multiline commands in Bash.
-Avoid double backslashes in pasted shell commands.
-Re-login after restarting or recreating services if you no longer have a valid token in your shell.
-Re-register only if login says the user does not exist or the database was reset.

Near-term deliverables
Backend deliverables now mostly complete:

-Auth.
-Protected job APIs.
-Worker execution.
-Success and failure lifecycle.
-Events and artifact reads.
-Delete rules.
-Cancellation flow.

Remaining short-term deliverables:

-Real workload execution path.
-Simple demo UI.
-Clearer GPU assignment flow.
-Cascade-delete verification.
-Celery worker warning cleanup.

Longer-term deliverables
-Better scheduling and queueing.
-Cloud deployment.
-Architecture diagram.
-Portfolio/demo polish.