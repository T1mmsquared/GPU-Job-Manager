import { useState } from "react";

export default function JobSubmitForm({ onSubmit, loading }) {
  const [modelName, setModelName] = useState("llama3.1");
  const [prompt, setPrompt] = useState("");
  const [shouldFail, setShouldFail] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await onSubmit({
        model_name: modelName.trim(),
        params: { prompt: prompt.trim(), ...(shouldFail ? { should_fail: true } : {}) },
      });
      setPrompt("");
      setShouldFail(false);
    } catch (err) {
      setError(err.message || "Failed to submit job");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header"><h2>Submit Job</h2></div>

      <form className="stack" onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: "14px" }}>
          <label>
            Model name
            <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)}
              placeholder="llama3.1" required />
          </label>
          <label>
            Prompt
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the work for this job..." required />
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <label className="checkbox-row">
            <input type="checkbox" checked={shouldFail} onChange={(e) => setShouldFail(e.target.checked)} />
            Simulate failure
          </label>
          {error && <div className="form-error" style={{ flex: 1 }}>? {error}</div>}
          <button type="submit" className="button" disabled={loading} style={{ whiteSpace: "nowrap" }}>
            {loading ? "Submitting..." : "+ Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
