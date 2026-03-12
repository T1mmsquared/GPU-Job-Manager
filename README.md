\# gpu-job-manager



GPU Job Manager is an authenticated backend system for submitting, tracking, and executing asynchronous GPU model jobs.



It combines the API and persistence foundation from gpu-job-management-api with worker-side execution logic adapted from League of Doom.



The v1 goal is a narrow vertical slice:

\- A user logs in.

\- A user submits a GPU job.

\- The system stores and tracks the job lifecycle.

\- A worker executes one real model task on one GPU.

\- The API exposes status, progress, events, and result artifacts.



\## V1 Scope



Version 1 focuses on a single end-to-end path that works reliably.



Included in v1:

\- FastAPI backend as the main job submission and tracking surface.

\- PostgreSQL for durable job state.

\- Alembic for schema migrations.

\- Redis and Celery for background job execution.

\- JWT-based authentication.

\- Protected job APIs.

\- One real worker execution path adapted from League of Doom.

\- A simple demo frontend for login, submission, and job tracking.



Out of scope for v1:

\- Multi-GPU execution for a single job.

\- Smart scheduling and balancing.

\- Fancy frontend design.

\- Complex retries and failure recovery.

\- Production cloud deployment.

\- Multi-tenant administration features.



\## Core Flow



1\. The user authenticates.

2\. The user submits a job payload.

3\. The API stores the job in PostgreSQL with an initial queued status.

4\. A Celery worker picks up the job.

5\. The worker assigns a GPU and runs the model task.

6\. Progress and events are written back to the database.

7\. The user checks job status and retrieves the result artifact.



\## Initial Routes



\### Auth

\- `POST /auth/register`

\- `POST /auth/login`

\- `GET /auth/me`



\### Jobs

\- `POST /jobs`

\- `GET /jobs`

\- `GET /jobs/{id}`

\- `GET /jobs/{id}/events`



\### System

\- `GET /health`



\## Job Lifecycle



The initial v1 job status enum is:

\- `queued`

\- `assigned`

\- `running`

\- `succeeded`

\- `failed`

\- `cancelled`



\## Initial Job Payload



```json

{

&nbsp; "model\_name": "string",

&nbsp; "params": {},

&nbsp; "gpu\_preference": "string or null",

&nbsp; "priority": 0

}



Source Map

Keep from gpu-job-management-api:



-app/main.py

-core/

-models/

-schemas/

-routes/

-services/

-Docker/Postgres/Alembic foundation



Adapt from League of Doom:



-orchestrator/ into worker execution logic

-selected routing logic for future affinity rules

-model-serving scripts/configs as worker-side assets

-League of Doom stays behind the job manager as the execution layer, not the main app shell.



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





Status



Day 1 locks the contract and repo structure.

Day 2 adds schema and authentication.

Day 3 adds protected job APIs.

Day 4 wires Celery and Redis.

Day 5 integrates one real worker path.

Day 6 adds the demo frontend.

Day 7 hardens and packages the demo.





