import { useState } from "react";

export default function LoginForm({ onLogin, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    await onLogin({ email, password });
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <div className="auth-logo">
          <div className="auth-logo-dot">?</div>
          <h1>GPU Job Manager</h1>
        </div>
        <p>Sign in to submit, track, cancel, and delete jobs.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="**********" autoComplete="current-password" required />
        </label>
        {error && <div className="form-error">? {error}</div>}
        <button type="submit" className="button" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="auth-help">
        Use a backend account created via the API or your login helper script.
      </p>
    </div>
  );
}
