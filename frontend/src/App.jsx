import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ScrollToTop from "./components/layout/ScrollToTop";
import { RequireAuth, RequireInstructor } from "./components/layout/RequireAuth";
import Landing from "./pages/Landing";
import Catalog from "./pages/Catalog";
import CourseDetail from "./pages/CourseDetail";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Player from "./pages/Player";
import Profile from "./pages/Profile";
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorCourseEditor from "./pages/InstructorCourseEditor";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Landing />} />
          <Route path="courses" element={<Catalog />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="signup" element={<AuthPage mode="signup" />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="learn/:courseId" element={<Player />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route
            path="profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="instructor"
            element={
              <RequireInstructor>
                <InstructorDashboard />
              </RequireInstructor>
            }
          />
          <Route
            path="instructor/courses/:courseId"
            element={
              <RequireInstructor>
                <InstructorCourseEditor />
              </RequireInstructor>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
