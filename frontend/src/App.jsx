import { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";
import useAuth from "./hooks/useAuth";
import LoginForm from "./components/LoginForm";
import JobSubmitForm from "./components/JobSubmitForm";
import JobList from "./components/JobList";
import JobDetail from "./components/JobDetail";
import JobEvents from "./components/JobEvents";
import {
  API_BASE_URL,
  cancelJob,
  createJob,
  deleteJob,
  getJob,
  getJobArtifact,
  getJobEvents,
  listJobs,
} from "./api/client";

export default function App() {
  const {
    user,
    token,
    isAuthenticated,
    authLoading,
    authError,
    login,
    logout,
  } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [events, setEvents] = useState([]);
  const [artifact, setArtifact] = useState(null);

  const [jobsLoading, setJobsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [pageError, setPageError] = useState("");

  const sortedJobs = useMemo(() => jobs, [jobs]);

  const loadJobs = useCallback(async () => {
    if (!token) return;

    try {
      setJobsLoading(true);
      const data = await listJobs(token, { limit: 25, offset: 0 });
      setJobs(data);

      if (!selectedJobId && data.length > 0) {
        setSelectedJobId(data[0].id);
      }

      if (selectedJobId && !data.some((job) => job.id === selectedJobId)) {
        setSelectedJobId(data[0]?.id || "");
      }
    } catch (error) {
      setPageError(error.message || "Failed to load jobs");
    } finally {
      setJobsLoading(false);
    }
  }, [token, selectedJobId]);

  const loadSelectedJob = useCallback(async () => {
    if (!token || !selectedJobId) {
      setSelectedJob(null);
      setEvents([]);
      setArtifact(null);
      return;
    }

    try {
      setDetailLoading(true);
      setEventsLoading(true);

      const [jobData, eventData] = await Promise.all([
        getJob(token, selectedJobId),
        getJobEvents(token, selectedJobId),
      ]);

      setSelectedJob(jobData);
      setEvents(eventData);

      try {
        const artifactData = await getJobArtifact(token, selectedJobId);
        setArtifact(artifactData);
      } catch (error) {
        setArtifact(null);
      }
    } catch (error) {
      setPageError(error.message || "Failed to load job detail");
    } finally {
      setDetailLoading(false);
      setEventsLoading(false);
    }
  }, [token, selectedJobId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadJobs();
  }, [isAuthenticated, loadJobs]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      loadJobs();
      if (selectedJobId) {
        loadSelectedJob();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, loadJobs, loadSelectedJob, selectedJobId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedJobId) return;
    loadSelectedJob();
  }, [isAuthenticated, selectedJobId, loadSelectedJob]);

  async function handleCreateJob(payload) {
    setSubmitLoading(true);
    setPageError("");

    try {
      const created = await createJob(token, payload);
      await loadJobs();
      setSelectedJobId(created.id);
      await loadSelectedJob();
    } catch (error) {
      setPageError(error.message || "Failed to create job");
      throw error;
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleCancelJob(jobId) {
    setActionLoadingId(jobId);
    setPageError("");

    try {
      await cancelJob(token, jobId);
      await loadJobs();
      if (selectedJobId === jobId) {
        await loadSelectedJob();
      }
    } catch (error) {
      setPageError(error.message || "Failed to cancel job");
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleDeleteJob(jobId) {
    setActionLoadingId(jobId);
    setPageError("");

    try {
      await deleteJob(token, jobId);
      const wasSelected = selectedJobId === jobId;
      await loadJobs();

      if (wasSelected) {
        setSelectedJob(null);
        setEvents([]);
        setArtifact(null);
      }
    } catch (error) {
      setPageError(error.message || "Failed to delete job");
    } finally {
      setActionLoadingId("");
    }
  }

  if (authLoading && !isAuthenticated) {
    return (
      <main className="page page--centered">
        <div className="panel">
          <p>Checking session...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="page page--centered">
        <LoginForm onLogin={login} loading={authLoading} error={authError} />
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>GPU Job Manager</h1>
          <p className="muted">
            Demo UI for submission, status tracking, events, artifacts, cancel,
            and delete.
          </p>
        </div>

        <div className="topbar__actions">
          <div className="user-chip">
            <span className="user-chip__label">Signed in as</span>
            <strong>{user?.email || "Unknown user"}</strong>
          </div>
          <button className="button button--secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {pageError ? <div className="form-error">{pageError}</div> : null}

      <div className="dashboard-stack">
        <JobSubmitForm onSubmit={handleCreateJob} loading={submitLoading} />

        <div className="dashboard-grid dashboard-grid--main">
          <div className="dashboard-column">
            <div className="panel">
              <div className="panel-header">
                <h2>Session</h2>
                <span className="muted">{jobsLoading ? "Refreshing..." : "Live"}</span>
              </div>
              <p className="muted">
                API base URL: <code>{API_BASE_URL}</code>
              </p>
              <p className="muted">
                Polling jobs and selected job every 3 seconds.
              </p>
            </div>

            <JobList
              jobs={sortedJobs}
              selectedJobId={selectedJobId}
              onSelect={setSelectedJobId}
              onCancel={handleCancelJob}
              onDelete={handleDeleteJob}
              actionLoadingId={actionLoadingId}
            />
          </div>

          <div className="dashboard-column">
            {detailLoading ? (
              <div className="panel">
                <p>Loading job detail...</p>
              </div>
            ) : (
              <JobDetail
                job={selectedJob}
                artifact={artifact}
                onCancel={handleCancelJob}
                onDelete={handleDeleteJob}
                actionLoading={Boolean(actionLoadingId)}
              />
            )}

            <JobEvents events={events} loading={eventsLoading} />
          </div>
        </div>
      </div>
    </main>
  );
}
