# GPU Job Manager

GPU Job Manager is a production-style system for submitting, tracking, and executing asynchronous GPU model jobs.

It combines the API and persistence foundation from `gpu-job-management-api` with worker-side execution patterns adapted from League of Doom, while evolving into its own standalone project with native worker execution, clearer GPU assignment, and policy-driven orchestration.

## Overview

This project is designed to demonstrate how a modern GPU job platform can be built in layers:

- An authenticated FastAPI backend for job submission and lifecycle management.
- A Redis and Celery execution layer for asynchronous work.
- PostgreSQL-backed persistence for jobs, events, users, and artifacts.
- A React frontend MVP for login, submission, tracking, and inspection.
- A worker roadmap that moves from simulation to real model execution and GPU-aware orchestration.

The goal is not only to run jobs, but to show production-minded engineering around state transitions, cancellation, observability, extensibility, and future agent orchestration.

## Current Status

The project currently has a working backend vertical slice, cooperative cancellation support, and a validated MVP frontend UI that appears to be working as intended.

Today, the system supports:

- Authenticated job submission.
- Job listing and detail retrieval.
- Job event history.
- Result artifact lookup.
- Delete rules with ownership and state protection.
- Queued and running cancellation behavior.
- Browser-based login, submission, polling, detail views, and job management from the frontend.

The current worker execution path is still simulated.

The next phase is to reconstruct the known worker paths into this repository so GPU Job Manager becomes fully self-contained, then replace the simulated path with native real workload execution and clearer GPU assignment behavior.

## Why This Project Matters

GPU Job Manager is structured to reflect the kinds of concerns that show up in real backend and platform engineering work:

- API design for asynchronous compute jobs.
- Queue-based execution and worker separation.
- Persistent lifecycle tracking and event history.
- Safe cancellation and terminal-state protections.
- Frontend and backend integration across an authenticated workflow.
- A clear path toward GPU-aware scheduling and model orchestration.

For recruiters and hiring managers, this project is intended to demonstrate practical experience with systems design, backend APIs, async processing, data modeling, containerized development, and staged platform evolution rather than only isolated scripts or demos.

## Architecture

Current architecture:

- FastAPI API service.
- Celery worker service.
- Redis queue and broker.
- PostgreSQL persistence layer.
- React + Vite frontend.
- Docker Compose local environment.

Target architecture:

- Native worker execution paths inside this repository.
- Real model execution instead of the current simulated worker path.
- Host GPU discovery and assignment tracking.
- Policy-driven orchestration for routing work to the smallest eligible agent tier first.
- Evaluation and audit records for routing, fallback, review, and execution outcomes.

## Implemented Features

### Backend

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
- Running-job delete protection with `409 Conflict`.
- Job cancellation route.
- Queued-job cancellation.
- Running-job cooperative cancellation.
- Cancellation event history.
- Restart-safe queued cancellation guard in the worker.

### Frontend

- React + Vite frontend scaffolded under `frontend/`.
- Authenticated MVP UI for login, submission, and job tracking.
- Frontend-to-backend connectivity configured for LAN access.
- CORS enabled in FastAPI for frontend development origins.
- Jobs list, job detail, and job events polling integrated into the UI.
- Artifact handling improved so missing artifacts can be treated as expected for non-succeeded jobs.
- Layout and interaction fixes completed to support a usable MVP workflow.

## Validated Behavior

### Backend behavior

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

### Frontend behavior

The MVP frontend has been validated as working as intended for the current scope:

- Login and authenticated dashboard access.
- Job submission from the browser.
- Jobs list polling.
- Selected job detail loading.
- Job events loading.
- Cancel handling.
- Delete handling.
- Responsive layout suitable for demo and development use.

The frontend should still be treated as an MVP rather than a polished production UI, but the core workflow is now in place and usable.

## Implemented Routes

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

## Job Lifecycle

Current job statuses:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

Cancellation behavior:

- Queued jobs can be cancelled immediately.
- Running jobs are cancelled cooperatively by the worker.
- `cancel_requested` is persisted so the worker can stop safely.
- The worker checks cancellation state before starting execution and during the simulated run loop.

## Repo Layout

```text
GPU-Job-Manager/
├── alembic/
├── app/
│   ├── core/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   └── services/
├── frontend/
├── scripts/
└── worker/
    ├── execution/
    │   ├── main.py
    │   ├── planner_agent.py
    │   ├── research_agent.py
    │   └── routing/
    └── tasks/
```

## Local Development

From the repository root:

```bash
docker compose up -d --build
docker compose ps
```

Recreate only the API after code changes:

```bash
docker compose up -d --force-recreate api
docker compose ps
```

Recreate only the worker after task changes:

```bash
docker compose up -d --force-recreate worker
docker compose ps
```

## Helper Scripts

The `scripts/` folder contains small helpers to resume the stack, log in, and run a backend smoke test.

### `scripts/resume.sh`

Used to restart the stack and wait for the API to respond.

```bash
./scripts/resume.sh up
./scripts/resume.sh api
./scripts/resume.sh worker
./scripts/resume.sh all
```

### `scripts/login.sh`

Registers if needed and logs in, then prints export commands for a token.

```bash
./scripts/login.sh
```

Example usage:

```bash
eval "$(./scripts/login.sh | tail -n 4)"
```

### `scripts/smoke_test.sh`

Runs an end-to-end backend smoke test using the current `TOKEN`.

```bash
./scripts/smoke_test.sh
```

The smoke test covers:

- Success job flow.
- Failure job flow.
- Event and artifact retrieval.
- Delete behavior.
- Running-job delete protection.
- Queued cancellation behavior.
- Running cancellation behavior.
- Terminal cancel protection.

## Decision Direction

The orchestrator direction for this project is intentionally policy-driven rather than purely heuristic.

Current design principles:

- Use the smallest eligible agent tier first.
- Escalate only when task complexity or correctness risk justifies a larger model path.
- Separate planner, scheduler, executor, and evaluator responsibilities.
- Preserve structured reasoning state instead of raw hidden chain-of-thought.
- Require stronger review and execution checks for non-trivial code generation paths.
- Add GPU reservation and fallback behavior before scaling up agent complexity.

This keeps the system aligned with production-minded evaluation and avoids turning orchestration into an opaque black box.

## Next Steps

Near-term priorities:

1. Finalize remaining frontend polish such as empty states, clearer loading feedback, and improved API error presentation.
2. Explicitly verify cascade-delete behavior for events and artifacts.
3. Reconstruct the known worker execution paths from League of Doom into GPU Job Manager so the worker becomes native to this repository.
4. Replace the simulated worker path with a real model execution path.
5. Add clearer GPU assignment behavior beyond `gpu_id="local-sim"`.
6. Add observability and audit fields for model version, prompt version, routing decisions, GPU assignment, fallback reason, and validator outcomes.
7. Introduce an evaluation rubric and release gates for orchestration changes.
8. Address the Celery container user warning cleanly.

Longer-term priorities:

- Better scheduling and queueing.
- Policy-driven multi-agent orchestration.
- Architecture diagram and deployment documentation.
- Cloud deployment exploration.
- Portfolio and demo polish.

## Definition of Done

A strong next milestone for this project is:

- Submit a real job.
- Assign it to a detected GPU target.
- Execute it through a native worker path inside this repository.
- Track events from queue to terminal state.
- Produce an artifact.
- Cancel it safely when needed.
- Audit why the orchestrator made its routing and assignment decisions.

That milestone would turn the current MVP into a much stronger end-to-end platform demonstration.

## Notes

- Use the backend host IP in `frontend/.env` instead of `localhost` when testing from another machine on the LAN.
- Re-login after restarting or recreating services if your shell no longer has a valid token.
- If editing shell scripts on Windows, ensure LF line endings are preserved.
- Normalize line endings with `dos2unix scripts/*.sh` if you hit shell-format issues.

## Summary

GPU Job Manager already demonstrates a solid backend foundation, validated frontend integration, and careful lifecycle handling for asynchronous GPU jobs.

The work remaining is focused less on proving the basic platform and more on completing the transition from simulated execution to native worker paths, real workloads, GPU-aware orchestration, and stronger production-style governance.