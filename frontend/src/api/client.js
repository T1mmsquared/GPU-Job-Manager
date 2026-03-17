const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token
        ? { Authorization: `Bearer ${options.token}` }
        : {}),
      ...(options.headers || {}),
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.detail
        ? data.detail
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function getMe(token) {
  return request("/auth/me", {
    token,
  });
}

export async function listJobs(token, params = {}) {
  const search = new URLSearchParams();

  if (params.status) search.set("status", params.status);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));

  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/jobs${query}`, { token });
}

export async function getJob(token, jobId) {
  return request(`/jobs/${jobId}`, { token });
}

export async function getJobEvents(token, jobId) {
  return request(`/jobs/${jobId}/events`, { token });
}

export async function getJobArtifact(token, jobId) {
  return request(`/jobs/${jobId}/artifact`, { token });
}

export async function createJob(token, payload) {
  return request("/jobs", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function cancelJob(token, jobId) {
  return request(`/jobs/${jobId}/cancel`, {
    method: "POST",
    token,
  });
}

export async function deleteJob(token, jobId) {
  return request(`/jobs/${jobId}`, {
    method: "DELETE",
    token,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export { API_BASE_URL };
