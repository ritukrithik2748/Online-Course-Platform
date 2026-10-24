import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Field from "../components/ui/Field";
import { validateLogin, validateSignup } from "../lib/validation";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(window.google));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google script failed to load"));
    document.head.appendChild(script);
  });
}

const ROLE_OPTIONS = [
  {
    value: "student",
    label: "I want to learn",
    description: "Browse, enroll and track progress.",
    icon: Users,
  },
  {
    value: "instructor",
    label: "I want to teach",
    description: "Create courses and reach students.",
    icon: Sparkles,
  },
];

function safeNext(value, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export default function AuthPage({ mode = "login" }) {
  const isLogin = mode === "login";
  const { login, register, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const initialRole = searchParams.get("role") === "instructor" ? "instructor" : "student";

  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: initialRole,
    remember: true,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then((google) => {
        if (cancelled || !google?.accounts?.id) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setGoogleBusy(true);
            setFormError("");
            try {
              await loginWithGoogle(response.credential, true);
              success("Welcome to LearNova", "You are signed in with Google.");
              navigate(next, { replace: true });
            } catch (error) {
              setFormError(error.message || "Google sign-in failed. Please try again.");
            } finally {
              setGoogleBusy(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        const button = document.getElementById("google-signin-button");
        if (button) google.accounts.id.renderButton(button, { theme: "outline", size: "large", width: 320, text: "continue_with" });
      })
      .catch(() => {
        /* Google script blocked — the manual button below still works */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={next} replace />;
  }

  const updateValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    if (formError) setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    const validationErrors = isLogin ? validateLogin(values) : validateSignup(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(values.email.trim(), values.password, values.remember);
        success("Welcome back", "Pick up right where you left off.");
        navigate(next, { replace: true });
      } else {
        await register(
          {
            first_name: values.firstName.trim(),
            last_name: values.lastName.trim(),
            email: values.email.trim(),
            password: values.password,
            role: values.role,
          },
          values.remember
        );
        success("Account created", "You are signed in. Let’s find your first course.");
        navigate(
          values.role === "instructor"
            ? safeNext(searchParams.get("next"), "/instructor")
            : next,
          { replace: true }
        );
      }
    } catch (error) {
      setFormError(error.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setFormError(
        "Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to frontend/.env (and GOOGLE_CLIENT_ID to backend/.env), then restart."
      );
      return;
    }
    setGoogleBusy(true);
    setFormError("");
    try {
      await loadGoogleScript();
      const btn = document.querySelector('#google-signin-button div[role="button"]');
      if (btn) {
        btn.click();
        return;
      }
      window.google?.accounts?.id?.prompt();
    } catch {
      setFormError("Google sign-in could not load. Check your connection and try again.");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="relative overflow-hidden py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ig-gradient-soft absolute inset-0 opacity-60" />
        <div className="absolute -right-24 top-10 size-80 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 size-72 rounded-full bg-orange-300/20 blur-3xl" />
      </div>

      <div className="container-page grid items-stretch gap-8 lg:grid-cols-[1fr_1.05fr]">
        {/* Story panel */}
        <div className="relative hidden overflow-hidden rounded-[2rem] p-8 text-white lg:flex lg:flex-col">
          <div className="ig-gradient absolute inset-0" />
          <div className="cover-pattern absolute inset-0 opacity-40" />
          <div className="absolute -right-10 -top-10 size-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-10 size-64 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <GraduationCap className="size-6" />
            </span>
            <span className="text-lg font-extrabold">LearNova</span>
          </div>

          <div className="relative mt-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
              {isLogin ? "Welcome back" : "Start your story"}
            </p>
            <h2 className="mt-3 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">
              {isLogin
                ? "Your next lesson is already waiting."
                : "Learn in small loops. Grow in big ways."}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
              {isLogin
                ? "Pick up your progress, keep your streak alive and finish what you started."
                : "Join thousands of learners taking practical, story-sized courses from instructors who ship real work."}
            </p>

            <ul className="mt-7 space-y-3 text-sm text-white/90">
              {[
                "Progress that follows you across devices",
                "Free and paid courses in six categories",
                "Mark lessons complete as you go",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur">
              <div className="flex -space-x-2">
                {["Maya Chen", "Andre Silva", "Priya Nair"].map((name) => (
                  <span
                    key={name}
                    className="flex size-8 items-center justify-center rounded-full border-2 border-white/50 bg-white/25 text-[10px] font-bold"
                  >
                    {name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                ))}
              </div>
              <p className="text-xs text-white/85">
                <span className="font-bold">12,000+ learners</span> are building something new.
              </p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="surface mx-auto w-full max-w-lg p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ig-pink">
              {isLogin ? "Log in" : "Create account"}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {isLogin ? "Good to see you again" : "Your first course is one step away"}
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {isLogin ? (
                <>
                  New here?{" "}
                  <Link
                    to={`/signup${searchParams.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`}
                    className="font-bold text-ig-pink hover:underline"
                  >
                    Create a free account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link
                    to={`/login${searchParams.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`}
                    className="font-bold text-ig-pink hover:underline"
                  >
                    Log in
                  </Link>
                </>
              )}
            </p>
          </div>

          {formError && (
            <div
              className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Google sign-in */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleBusy}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <div id="google-signin-button" className="hidden" />

            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
              or
              <span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!isLogin && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" htmlFor="firstName" error={errors.firstName}>
                    <input
                      id="firstName"
                      className={`input ${errors.firstName ? "input-error" : ""}`}
                      value={values.firstName}
                      onChange={(event) => updateValue("firstName", event.target.value)}
                      autoComplete="given-name"
                      placeholder="Sam"
                    />
                  </Field>
                  <Field label="Last name" htmlFor="lastName" error={errors.lastName}>
                    <input
                      id="lastName"
                      className={`input ${errors.lastName ? "input-error" : ""}`}
                      value={values.lastName}
                      onChange={(event) => updateValue("lastName", event.target.value)}
                      autoComplete="family-name"
                      placeholder="Rivera"
                    />
                  </Field>
                </div>

                <fieldset>
                  <legend className="label">I’m here to</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ROLE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const active = values.role === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() => updateValue("role", option.value)}
                          className={`rounded-2xl border p-3 text-left transition ${
                            active
                              ? "border-pink-400 bg-pink-50/70 ring-2 ring-pink-500/15 dark:border-pink-500/60 dark:bg-pink-500/10"
                              : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20"
                          }`}
                          aria-pressed={active}
                        >
                          <span className="flex items-center gap-2 text-sm font-bold">
                            <Icon
                              className={`size-4 ${active ? "text-ig-pink" : "text-zinc-400"}`}
                            />
                            {option.label}
                          </span>
                          <span className="mt-1 block text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            )}

            <Field label="Email address" htmlFor="email" error={errors.email}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="email"
                  type="email"
                  className={`input pl-11 ${errors.email ? "input-error" : ""}`}
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(errors.email)}
                />
              </div>
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              error={errors.password}
              hint={!isLogin ? "At least 6 characters. Pick something you don’t reuse." : undefined}
            >
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`input px-11 ${errors.password ? "input-error" : ""}`}
                  value={values.password}
                  onChange={(event) => updateValue("password", event.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {!isLogin && (
              <Field
                label="Confirm password"
                htmlFor="confirmPassword"
                error={errors.confirmPassword}
                hint={
                  values.confirmPassword && values.password
                    ? values.confirmPassword === values.password
                      ? "Passwords match"
                      : "Passwords do not match"
                    : undefined
                }
              >
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    className={`input pl-11 ${errors.confirmPassword ? "input-error" : values.confirmPassword && values.password && values.confirmPassword === values.password ? "border-emerald-400 focus:border-emerald-400 focus:ring-emerald-500/10" : values.confirmPassword && values.password && values.confirmPassword !== values.password ? "border-red-300 focus:border-red-400 focus:ring-red-500/10" : ""}`}
                    value={values.confirmPassword}
                    onChange={(event) => updateValue("confirmPassword", event.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(errors.confirmPassword)}
                  />
                  {values.confirmPassword && values.password && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {values.confirmPassword === values.password ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="size-4 text-red-500" />
                      )}
                    </span>
                  )}
                </div>
              </Field>
            )}

            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={values.remember}
                  onChange={(event) => updateValue("remember", event.target.checked)}
                  className="size-4 rounded border-zinc-300 accent-pink-600"
                />
                Keep me signed in
              </label>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary w-full !py-3">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isLogin ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                <>
                  {isLogin ? "Log in" : "Create my account"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">
            By continuing, you agree to LearNova&apos;s{" "}
            <Link to="/terms" className="font-semibold text-zinc-500 underline hover:text-ig-pink dark:text-zinc-400">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-semibold text-zinc-500 underline hover:text-ig-pink dark:text-zinc-400">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
