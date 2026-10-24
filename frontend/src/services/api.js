import { tokenStore } from "./tokenStore";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function errorMessage(payload, status) {
  if (payload && typeof payload.detail === "string") return payload.detail;
  if (payload && Array.isArray(payload.detail) && payload.detail.length) {
    return payload.detail
      .map((item) => item.msg || item.message || "Invalid value")
      .join(". ");
  }
  if (status === 401) return "Please sign in again.";
  if (status === 403) return "You do not have access to this.";
  if (status === 404) return "We could not find that resource.";
  if (status === 429) return "Too many requests. Please slow down.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "Request failed. Please try again.";
}

function toQueryString(params = {}) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

async function request(path, { method = "GET", body, auth = true, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Cannot reach the API. Is the gateway running?", 0);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { detail: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      window.dispatchEvent(new Event("coursehub:unauthorized"));
    }
    throw new ApiError(errorMessage(payload, response.status), response.status, payload);
  }

  return payload;
}

export const api = {
  baseUrl: BASE_URL,
  auth: {
    register: (body) => request("/api/register", { method: "POST", body, auth: false }),
    login: (body) => request("/api/login", { method: "POST", body, auth: false }),
    googleLogin: (credential) =>
      request("/api/auth/google", { method: "POST", body: { credential }, auth: false }),
    me: () => request("/api/me"),
    updateProfile: (body) => request("/api/me", { method: "PATCH", body }),
    changePassword: (body) => request("/api/me/password", { method: "POST", body }),
    uploadAvatar: async (file) => {
      const token = tokenStore.get();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE_URL}/api/me/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const text = await res.text();
      let payload = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = { detail: text }; }
      if (!res.ok) throw new ApiError(payload?.detail || "Upload failed", res.status, payload);
      return payload;
    },
  },
  catalog: {
    courses: (params, signal) =>
      request(`/api/courses${toQueryString(params)}`, { signal }),
    course: (courseId, signal) => request(`/api/courses/${courseId}`, { signal }),
    categories: (signal) => request("/api/categories", { signal }),
    reviews: (courseId, signal) => request(`/api/courses/${courseId}/reviews`, { signal }),
    createReview: (courseId, body) =>
      request(`/api/courses/${courseId}/reviews`, { method: "POST", body }),
  },
  learning: {
    enroll: (courseId) => request("/api/enroll", { method: "POST", body: { course_id: courseId } }),
    myCourses: (signal) => request("/api/my-courses", { signal }),
    content: (courseId, signal) => request(`/api/courses/${courseId}/content`, { signal }),
    updateProgress: (lessonId, body) =>
      request(`/api/lessons/${lessonId}/progress`, { method: "POST", body }),
  },
  instructor: {
    courses: (signal) => request("/api/instructor/courses", { signal }),
    stats: (signal) => request("/api/instructor/stats", { signal }),
    createCourse: (body) => request("/api/courses", { method: "POST", body }),
    updateCourse: (courseId, body) =>
      request(`/api/courses/${courseId}`, { method: "PATCH", body }),
    deleteCourse: (courseId) =>
      request(`/api/courses/${courseId}`, { method: "DELETE" }),
    createSection: (courseId, body) =>
      request(`/api/courses/${courseId}/sections`, { method: "POST", body }),
    updateSection: (sectionId, body) =>
      request(`/api/sections/${sectionId}`, { method: "PATCH", body }),
    deleteSection: (sectionId) =>
      request(`/api/sections/${sectionId}`, { method: "DELETE" }),
    createLesson: (sectionId, body) =>
      request(`/api/sections/${sectionId}/lessons`, { method: "POST", body }),
    updateLesson: (lessonId, body) =>
      request(`/api/lessons/${lessonId}`, { method: "PATCH", body }),
    deleteLesson: (lessonId) =>
      request(`/api/lessons/${lessonId}`, { method: "DELETE" }),
  },
};
