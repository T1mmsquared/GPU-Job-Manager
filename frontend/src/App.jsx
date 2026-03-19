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

  const loadSelectedJob = useCallback(
    async (jobId = selectedJobId) => {
      if (!token || !jobId) {
        setSelectedJob(null);
        setEvents([]);
        setArtifact(null);
        return;
      }

      try {
        setDetailLoading(true);
        setEventsLoading(true);

        const [jobData, eventData] = await Promise.all([
          getJob(token, jobId),
          getJobEvents(token, jobId),
        ]);

        setSelectedJob(jobData);
        setEvents(eventData);

        if (jobData.status === "succeeded") {
          try {
            const artifactData = await getJobArtifact(token, jobId);
            setArtifact(artifactData);
          } catch {
            setArtifact(null);
          }
        } else {
          setArtifact(null);
        }
      } catch (error) {
        setPageError(error.message || "Failed to load job detail");
      } finally {
        setDetailLoading(false);
        setEventsLoading(false);
      }
    },
    [token, selectedJobId]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    loadJobs();
  }, [isAuthenticated, loadJobs]);

  useEffect(() => {
   if (!isAuthenticated) return;
   const interval = setInterval(() => {
     loadJobs();
     const terminal = ["succeeded", "failed", "cancelled"];
     if (selectedJobId && !terminal.includes(selectedJob?.status)) 
   {
      loadSelectedJob(selectedJobId);
    }
  }, 3000);
  return () => clearInterval(interval);
}, [isAuthenticated, loadJobs, loadSelectedJob, selectedJobId, selectedJob?.status]);

  useEffect(() => {
    if (!isAuthenticated || !selectedJobId) return;
    loadSelectedJob(selectedJobId);
  }, [isAuthenticated, selectedJobId, loadSelectedJob]);

  async function handleCreateJob(payload) {
    setSubmitLoading(true);
    setPageError("");

    try {
      const created = await createJob(token, payload);
      await loadJobs();
      setSelectedJobId(created.id);
      await loadSelectedJob(created.id);
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
        await loadSelectedJob(jobId);
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
        setSelectedJobId("");
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

  // -- Loading state --
  if (authLoading && !isAuthenticated) {
    return (
      <main className="page page--centered">
        <div className="panel" style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
          <div className="skeleton" style={{ height: 20, marginBottom: 12 }} />
          <p className="muted">Checking session...</p>
        </div>
      </main>
    );
  }

  // -- Login --
  if (!isAuthenticated) {
    return (
      <main className="page page--centered">
        <LoginForm onLogin={login} loading={authLoading} error={authError} />
      </main>
    );
  }

  // -- Dashboard --
  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>GPU Job Manager</h1>
          <p className="muted" style={{ fontSize: "0.82rem", marginTop: 4 }}>
            Submit, track, cancel, and delete async GPU jobs.
          </p>
        </div>
        <div className="topbar__actions">
          <div className="user-chip">
            <span className="user-chip__label">Signed in as</span>
            <strong>{user?.email || "Unknown"}</strong>
          </div>
          <button className="button button--ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      {pageError && (
        <div className="page-error-banner">
          <span>? {pageError}</span>
          <button onClick={() => setPageError("")}>?</button>
        </div>
      )}

      <div className="dashboard-layout">
  {/* Submit bar -- full width */}
  <div className="dashboard-layout__topbar">
    <JobSubmitForm onSubmit={handleCreateJob} loading={submitLoading} />
  </div>

  {/* Three-column body */}
  <div className="dashboard-layout__body">

    {/* LEFT: Session + Job List */}
    <div className="dashboard-column">
      <div className="panel">
        <div className="panel-header">
          <h2>Session</h2>
          <span className={`live-dot${jobsLoading ? " live-dot--loading" : ""}`}>
            {jobsLoading ? "Refreshing" : "Live * 3s"}
          </span>
        </div>
        <div className="session-info">
          <div className="session-row">
            <span className="session-row__label">API base</span>
            <span className="session-row__value">{API_BASE_URL}</span>
          </div>
          <div className="session-row">
            <span className="session-row__label">Jobs loaded</span>
            <span className="session-row__value">{jobs.length}</span>
          </div>
        </div>
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

    {/* RIGHT: Job Detail + Events */}
    <div className="dashboard-column">
      {detailLoading ? (
        <div className="panel">
          <div className="panel-header"><h2>Job Detail</h2></div>
          <div className="stack">
            <div className="skeleton" style={{ height: 80 }} />
            <div className="skeleton" style={{ height: 120 }} />
          </div>
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
