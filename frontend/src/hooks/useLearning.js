import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useMyCourses() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["my-courses"],
    queryFn: ({ signal }) => api.learning.myCourses(signal),
    enabled: isAuthenticated,
  });
}

export function useCourseContent(courseId) {
  return useQuery({
    queryKey: ["course-content", String(courseId)],
    queryFn: ({ signal }) => api.learning.content(courseId, signal),
    enabled: Boolean(courseId),
  });
}

export function useEnroll(courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.learning.enroll(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", String(courseId)] });
      queryClient.invalidateQueries({ queryKey: ["course-content", String(courseId)] });
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateProgress(courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, isCompleted, position = 0 }) =>
      api.learning.updateProgress(lessonId, {
        is_completed: isCompleted,
        last_watched_position: position,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-content", String(courseId)] });
      queryClient.invalidateQueries({ queryKey: ["course", String(courseId)] });
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
    },
  });
}
