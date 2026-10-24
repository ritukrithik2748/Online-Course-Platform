import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../ui/StateViews";

function useRedirectTarget() {
  const location = useLocation();
  return `${location.pathname}${location.search}`;
}

export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const target = useRedirectTarget();
  if (isLoading) return <PageLoader label="Checking your session…" />;
  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(target)}`} replace />;
  }
  return children;
}

export function RequireInstructor({ children }) {
  const { isAuthenticated, isLoading, isInstructor } = useAuth();
  const target = useRedirectTarget();
  if (isLoading) return <PageLoader label="Checking your session…" />;
  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(target)}`} replace />;
  }
  if (!isInstructor) return <Navigate to="/dashboard" replace />;
  return children;
}
