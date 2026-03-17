import { useState } from "react";

export default function JobSubmitForm({ onSubmit, loading }) {
  const [modelName, setModelName] = useState("llama3.1");
  const [prompt, setPrompt] = useState("");
  const [shouldFail, setShouldFail] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const payload = {
        model_name: modelName.trim(),
        params: {
          prompt: prompt.trim(),
          ...(shouldFail ? { should_fail: true } : {}),
        },
      };

      await onSubmit(payload);
      setPrompt("");
      setShouldFail(false);
    } catch (err) {
      setError(err.message || "Failed to submit job");
    }
  }

  return (
    <div className="panel">
      <h2>Submit job</h2>

      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Model name
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="llama3.1"
            required
          />
        </label>

        <label>
          Prompt
          <textarea
            rows="4"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the work for this job"
            required
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={shouldFail}
            onChange={(e) => setShouldFail(e.target.checked)}
          />
          Simulate failure
        </label>

        {error ? <div className="form-error">{error}</div> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Create job"}
        </button>
      </form>
    </div>
  );
}
