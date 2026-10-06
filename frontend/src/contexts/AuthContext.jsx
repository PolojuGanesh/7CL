import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api.js";
import { AuthContext } from "./AuthContextValue.js";

export function AuthProvider({ children, skipSession = false }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!skipSession);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    if (skipSession) return undefined;

    let active = true;
    apiRequest("/auth/me")
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((error) => {
        if (active && error.status !== 401) {
          setSessionError(error.message ?? "Could not connect to the 7CL API.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [skipSession]);

  const value = useMemo(() => ({
    user,
    loading,
    sessionError,
    async login(credentials) {
      const result = await apiRequest("/auth/login", { method: "POST", body: credentials });
      setUser(result.user);
      return result.user;
    },
    async register(details) {
      const result = await apiRequest("/auth/register", { method: "POST", body: details });
      setUser(result.user);
      return result.user;
    },
    async logout() {
      await apiRequest("/auth/logout", { method: "POST", body: {} });
      setUser(null);
    },
    updateUser(nextUser) {
      setUser(nextUser);
    },
  }), [user, loading, sessionError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
