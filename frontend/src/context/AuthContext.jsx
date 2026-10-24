import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../services/api";
import { tokenStore } from "../services/tokenStore";

const AuthContext = createContext(null);
const UNAUTHORIZED_EVENT = "coursehub:unauthorized";

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [instructor, setInstructor] = useState(null);
  const [status, setStatus] = useState(() => (tokenStore.get() ? "loading" : "anonymous"));

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setInstructor(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setInstructor(null);
      setStatus("anonymous");
      return null;
    }
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setInstructor(data.instructor || null);
      setStatus("authenticated");
      return data.user;
    } catch (error) {
      // A 401/403 means the token is no longer valid — end the session.
      // Any other failure (gateway down, network hiccup) must NOT log the
      // user out: keep the token and let the UI retry the profile next time.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSession();
        return null;
      }
      setStatus("authenticated");
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    if (tokenStore.get()) refresh();
  }, [refresh]);

  useEffect(() => {
    const handleUnauthorized = () => clearSession();
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [clearSession]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== "coursehub.token") return;
      if (!event.newValue) {
        clearSession();
      } else if (!user) {
        refresh();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [clearSession, refresh, user]);

  const finishLogin = useCallback(
    async (data, remember) => {
      tokenStore.set(data.token, remember);
      setUser(data.user);
      setStatus("authenticated");
      try {
        const me = await api.auth.me();
        setUser(me.user);
        setInstructor(me.instructor || null);
      } catch {
        /* the token is valid even if the profile refresh hiccups */
      }
      await queryClient.invalidateQueries();
      return data.user;
    },
    [queryClient]
  );

  const login = useCallback(
    async (email, password, remember = true) => {
      const data = await api.auth.login({ email, password });
      return finishLogin(data, remember);
    },
    [finishLogin]
  );

  const register = useCallback(
    async (payload, remember = true) => {
      const data = await api.auth.register(payload);
      return finishLogin(data, remember);
    },
    [finishLogin]
  );

  const loginWithGoogle = useCallback(
    async (credential, remember = true) => {
      const data = await api.auth.googleLogin(credential);
      return finishLogin(data, remember);
    },
    [finishLogin]
  );

  const updateProfile = useCallback(
    async (payload) => {
      const data = await api.auth.updateProfile(payload);
      setUser((current) => ({ ...current, ...data.user }));
      await refresh();
      return data.user;
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      user,
      instructor,
      status,
      isAuthenticated: status === "authenticated",
      isInstructor: user?.role === "instructor",
      isAdmin: user?.role === "admin",
      isLoading: status === "loading",
      login,
      register,
      loginWithGoogle,
      logout: clearSession,
      refresh,
      updateProfile,
    }),
    [user, instructor, status, login, register, loginWithGoogle, clearSession, refresh, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
