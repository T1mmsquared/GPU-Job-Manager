import { useState } from "react";

export default function LoginForm({ onLogin, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    await onLogin({ email, password });
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1>GPU Job Manager</h1>
        <p>Sign in to submit, track, cancel, and delete jobs.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Strong#Pass123"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <div className="form-error">{error}</div> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="auth-help">
        Use an account that already exists in your backend. You can create one
        from the API or your existing login helper script.
      </p>
    </div>
  );
}
