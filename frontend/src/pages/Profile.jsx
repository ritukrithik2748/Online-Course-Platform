import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Camera,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import Avatar from "../components/ui/Avatar";
import Field from "../components/ui/Field";
import { formatDate } from "../lib/format";
import { validatePassword, validateProfile } from "../lib/validation";

export default function Profile() {
  const { user, instructor, isInstructor, updateProfile, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    country: user?.country || "",
    profilePicture: user?.profile_picture || "",
    bio: instructor?.bio || "",
    yearsOfExperience: instructor?.years_of_experience ?? "",
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (profileErrors[name]) setProfileErrors((current) => ({ ...current, [name]: undefined }));
    if (profileError) setProfileError("");
  };

  const updatePasswordField = (name, value) => {
    setPasswords((current) => ({ ...current, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((current) => ({ ...current, [name]: undefined }));
    }
    if (passwordError) setPasswordError("");
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setProfileError("");
    try {
      const result = await api.auth.uploadAvatar(file);
      const newUrl = result.profile_picture;
      setForm((current) => ({ ...current, profilePicture: newUrl }));
      await updateProfile({ profile_picture: newUrl });
      await refresh();
      success("Profile photo updated", "Your new photo is live.");
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    const errors = validateProfile(form);
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingProfile(true);
    try {
      const payload = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        country: form.country.trim() || null,
        profile_picture: form.profilePicture.trim() || null,
      };
      if (isInstructor) {
        payload.bio = form.bio.trim() || null;
        payload.years_of_experience =
          form.yearsOfExperience === "" ? null : Number(form.yearsOfExperience);
      }
      const updated = await updateProfile(payload);
      setForm((current) => ({
        ...current,
        firstName: updated.first_name || "",
        lastName: updated.last_name || "",
      }));
      success("Profile updated", "Your changes are live across LearNova.");
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    const errors = validatePassword(passwords);
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingPassword(true);
    try {
      await api.auth.changePassword({
        current_password: passwords.currentPassword,
        new_password: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      success("Password changed", "Use your new password the next time you sign in.");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
        <div className="ig-gradient-soft absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#fbfafc] dark:to-zinc-950" />
      </div>

      <div className="container-page py-10 sm:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="story-ring w-fit rounded-full p-[3px]">
            <span className="block rounded-full bg-[#fbfafc] p-1 dark:bg-zinc-950">
              <Avatar name={fullName} src={user?.profile_picture} size="xl" />
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ig-pink">
              Profile &amp; settings
            </p>
            <h1 className="mt-1 truncate text-3xl font-extrabold tracking-tight">{fullName}</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge bg-pink-50 text-ig-pink dark:bg-pink-500/10 dark:text-pink-300">
                {user?.role}
              </span>
              {user?.country && (
                <span className="badge bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {user.country}
                </span>
              )}
              <span className="badge bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                Member since {formatDate(user?.created_at)}
              </span>
            </div>
          </div>
          {isInstructor && (
            <Link to="/instructor" className="btn btn-secondary sm:ml-auto">
              Instructor studio
            </Link>
          )}
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {/* Profile form */}
            <form onSubmit={handleProfileSubmit} className="surface p-5 sm:p-7">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-pink-50 text-ig-pink dark:bg-pink-500/10 dark:text-pink-300">
                  <User className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold">Your details</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    This is how you appear to students and instructors.
                  </p>
                </div>
              </div>

              {profileError && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {profileError}
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="First name" htmlFor="firstName" error={profileErrors.firstName}>
                  <input
                    id="firstName"
                    className={`input ${profileErrors.firstName ? "input-error" : ""}`}
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                    autoComplete="given-name"
                  />
                </Field>
                <Field label="Last name" htmlFor="lastName" error={profileErrors.lastName}>
                  <input
                    id="lastName"
                    className={`input ${profileErrors.lastName ? "input-error" : ""}`}
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    autoComplete="family-name"
                  />
                </Field>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Country" htmlFor="country" error={profileErrors.country}>
                  <input
                    id="country"
                    className={`input ${profileErrors.country ? "input-error" : ""}`}
                    value={form.country}
                    onChange={(event) => updateField("country", event.target.value)}
                    placeholder="Where are you learning from?"
                    autoComplete="country-name"
                  />
                </Field>
                <div>
                  <label className="label">Profile photo</label>
                  <div className="flex items-center gap-3">
                    <span className="story-ring rounded-full p-[2px]">
                      <span className="block rounded-full bg-[#fbfafc] p-0.5 dark:bg-zinc-950">
                        <Avatar name={fullName} src={form.profilePicture || user?.profile_picture} size="lg" />
                      </span>
                    </span>
                    <div className="flex flex-col gap-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="btn btn-secondary !py-2"
                      >
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <Camera className="size-4" />
                            Choose from computer
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        JPG, PNG, GIF or WebP · Max 5MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {isInstructor && (
                <>
                  <div className="divider my-6" />
                  <div className="mb-4">
                    <h3 className="text-sm font-extrabold">Instructor profile</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Students see this on your course pages.
                    </p>
                  </div>
                  <Field label="Bio" htmlFor="bio" error={profileErrors.bio}>
                    <textarea
                      id="bio"
                      rows={4}
                      className={`input resize-y ${profileErrors.bio ? "input-error" : ""}`}
                      value={form.bio}
                      onChange={(event) => updateField("bio", event.target.value)}
                      placeholder="What do you teach, and what makes your approach different?"
                    />
                  </Field>
                  <div className="mt-4 max-w-[220px]">
                    <Field
                      label="Years of experience"
                      htmlFor="yearsOfExperience"
                      hint="0–60 years."
                    >
                      <input
                        id="yearsOfExperience"
                        type="number"
                        min="0"
                        max="60"
                        className="input"
                        value={form.yearsOfExperience}
                        onChange={(event) => updateField("yearsOfExperience", event.target.value)}
                      />
                    </Field>
                  </div>
                </>
              )}

              <div className="mt-6 flex justify-end">
                <button type="submit" disabled={savingProfile} className="btn btn-primary">
                  {savingProfile ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save changes
                </button>
              </div>
            </form>

            {/* Password */}
            <form onSubmit={handlePasswordSubmit} className="surface p-5 sm:p-7">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold">Password &amp; security</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Use at least 6 characters. Your session stays active after a change.
                  </p>
                </div>
              </div>

              {passwordError && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {passwordError}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <Field
                  label="Current password"
                  htmlFor="currentPassword"
                  error={passwordErrors.currentPassword}
                >
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="currentPassword"
                      type={showPasswords ? "text" : "password"}
                      className={`input pl-11 ${passwordErrors.currentPassword ? "input-error" : ""}`}
                      value={passwords.currentPassword}
                      onChange={(event) =>
                        updatePasswordField("currentPassword", event.target.value)
                      }
                      autoComplete="current-password"
                    />
                  </div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="New password"
                    htmlFor="newPassword"
                    error={passwordErrors.newPassword}
                  >
                    <input
                      id="newPassword"
                      type={showPasswords ? "text" : "password"}
                      className={`input ${passwordErrors.newPassword ? "input-error" : ""}`}
                      value={passwords.newPassword}
                      onChange={(event) => updatePasswordField("newPassword", event.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field
                    label="Confirm new password"
                    htmlFor="confirmPassword"
                    error={passwordErrors.confirmPassword}
                  >
                    <input
                      id="confirmPassword"
                      type={showPasswords ? "text" : "password"}
                      className={`input ${passwordErrors.confirmPassword ? "input-error" : ""}`}
                      value={passwords.confirmPassword}
                      onChange={(event) =>
                        updatePasswordField("confirmPassword", event.target.value)
                      }
                      autoComplete="new-password"
                    />
                  </Field>
                </div>

                <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(event) => setShowPasswords(event.target.checked)}
                    className="size-4 accent-pink-600"
                  />
                  {showPasswords ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  Show passwords
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <button type="submit" disabled={savingPassword} className="btn btn-secondary">
                  {savingPassword ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="size-4" />
                  )}
                  Update password
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="surface p-5">
              <h2 className="text-base font-extrabold">Appearance</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Pick the vibe that suits your learning.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
                ].map((option) => {
                  const Icon = option.icon;
                  const active = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-xs font-bold transition ${
                        active
                          ? "border-pink-400 bg-pink-50/70 text-ig-pink dark:border-pink-500/50 dark:bg-pink-500/10 dark:text-pink-300"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20"
                      }`}
                      aria-pressed={active}
                    >
                      <Icon className="size-5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="surface p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                <h2 className="text-base font-extrabold">Account</h2>
              </div>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
                  <dd className="truncate font-semibold">{user?.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">Role</dt>
                  <dd className="font-semibold capitalize">{user?.role}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">Member since</dt>
                  <dd className="font-semibold">{formatDate(user?.created_at)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">Session</dt>
                  <dd className="font-semibold text-emerald-600 dark:text-emerald-400">Active</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-[11px] leading-5 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                Sessions expire automatically. If your token expires, you will be signed out and
                asked to log in again.
              </p>
            </div>

            <div className="ig-gradient-soft rounded-3xl border border-pink-100 p-5 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-wider text-ig-pink dark:text-pink-300">
                Keep going
              </p>
              <p className="mt-2 text-sm font-extrabold leading-snug">
                The best course is the one you finish.
              </p>
              <Link to="/dashboard" className="btn btn-secondary mt-4 w-full">
                Back to my learning
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
