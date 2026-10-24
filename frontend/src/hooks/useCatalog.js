import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export function useCourses(params = {}) {
  return useQuery({
    queryKey: ["courses", params],
    queryFn: ({ signal }) => api.catalog.courses(params, signal),
    staleTime: 60_000,
  });
}

export function useCourse(courseId) {
  return useQuery({
    queryKey: ["course", String(courseId)],
    queryFn: ({ signal }) => api.catalog.course(courseId, signal),
    enabled: Boolean(courseId),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => api.catalog.categories(signal),
    staleTime: 5 * 60_000,
  });
}

export function useReviews(courseId) {
  return useQuery({
    queryKey: ["reviews", String(courseId)],
    queryFn: ({ signal }) => api.catalog.reviews(courseId, signal),
    enabled: Boolean(courseId),
  });
}

export function useSubmitReview(courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.catalog.createReview(courseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", String(courseId)] });
      queryClient.invalidateQueries({ queryKey: ["course", String(courseId)] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
