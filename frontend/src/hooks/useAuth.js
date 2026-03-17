import { useCallback, useEffect, useState } from "react";
import { getMe, login as loginRequest } from "../api/client";

const TOKEN_STORAGE_KEY = "gpu_job_manager_token";

export default function useAuth() {
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_STORAGE_KEY) || ""
  );
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const [authError, setAuthError] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setUser(null);
    setAuthError("");
    setAuthLoading(false);
  }, []);

  const refreshMe = useCallback(
    async (activeToken = token) => {
      if (!activeToken) {
        setUser(null);
        setAuthLoading(false);
        return null;
      }

      setAuthLoading(true);
      setAuthError("");

      try {
        const me = await getMe(activeToken);
        setUser(me);
        return me;
      } catch (error) {
        logout();
        setAuthError(error.message || "Session expired");
        return null;
      } finally {
        setAuthLoading(false);
      }
    },
    [token, logout]
  );

  const login = useCallback(
    async ({ email, password }) => {
      setAuthLoading(true);
      setAuthError("");

      try {
        const data = await loginRequest(email, password);
        const nextToken = data.access_token;

        localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
        setToken(nextToken);

        const me = await getMe(nextToken);
        setUser(me);

        return { token: nextToken, user: me };
      } catch (error) {
        setAuthError(error.message || "Login failed");
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (token) {
      refreshMe(token);
    } else {
      setAuthLoading(false);
    }
  }, [token, refreshMe]);

  return {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    authLoading,
    authError,
    login,
    logout,
    refreshMe,
  };
}
