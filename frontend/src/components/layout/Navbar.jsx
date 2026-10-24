import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Avatar from "../ui/Avatar";

export default function Navbar() {
  const { user, isAuthenticated, isLoading, isInstructor, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    setProfileOpen(false);
    navigate("/");
  };

  const navLinkClass = ({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`;
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  return (
    <header className="bg-zinc-950 sticky top-0 z-40" style={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
      <nav className="container-page flex h-16 items-center justify-between gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="LearNova home">
          <span className="ig-gradient flex size-9 items-center justify-center rounded-xl shadow-glow">
            <GraduationCap className="size-5 text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Lear<span className="gradient-text">Nova</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <NavLink to="/courses" className={navLinkClass}>
            Explore
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/dashboard" className={navLinkClass}>
              My learning
            </NavLink>
          )}
          {isInstructor && (
            <NavLink to="/instructor" className={navLinkClass}>
              Teach
            </NavLink>
          )}
          <a href="/#categories" className="nav-link">
            Categories
          </a>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            {resolvedTheme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>

          {isLoading ? (
            <div className="skeleton ml-1 size-9 rounded-full" />
          ) : isAuthenticated ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full p-1 pr-1 transition hover:bg-white/10 sm:pr-2"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <Avatar name={fullName} src={user?.profile_picture} size="sm" />
                <span className="hidden max-w-24 truncate text-sm font-semibold text-white sm:block">
                  {user?.first_name}
                </span>
                <ChevronDown
                  className={`hidden size-4 text-zinc-300 transition sm:block ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div
                  className="animate-pop absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-2 shadow-[var(--shadow-soft)]"
                  role="menu"
                >
                  <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                    <Avatar name={fullName} src={user?.profile_picture} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{fullName}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-white/10" />
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                    role="menuitem"
                  >
                    <LayoutDashboard className="size-4" />
                    My learning
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                    role="menuitem"
                  >
                    <User className="size-4" />
                    Profile &amp; settings
                  </Link>
                  {isInstructor && (
                    <Link
                      to="/instructor"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                      role="menuitem"
                    >
                      <ShieldCheck className="size-4" />
                      Instructor studio
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                    role="menuitem"
                  >
                    <LogOut className="size-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn border border-white/20 bg-white/10 text-white hover:bg-white/20">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Get started
              </Link>
            </div>
          )}

          <button
            type="button"
            className="icon-btn lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="animate-fade-in border-t border-zinc-200/70 bg-white/95 px-4 pb-5 pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 lg:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/courses" className={navLinkClass}>
              Explore courses
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              My learning
            </NavLink>
            <NavLink to="/profile" className={navLinkClass}>
              Profile
            </NavLink>
            {isInstructor && (
              <NavLink to="/instructor" className={navLinkClass}>
                Instructor studio
              </NavLink>
            )}
          </div>
          {!isAuthenticated && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to="/login" className="btn border border-white/20 bg-white/10 text-white hover:bg-white/20">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Get started
              </Link>
            </div>
          )}
          {isAuthenticated && (
            <button type="button" onClick={handleLogout} className="btn btn-secondary mt-4 w-full">
              <LogOut className="size-4" />
              Log out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
