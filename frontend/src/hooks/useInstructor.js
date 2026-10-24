import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useInstructorCourses() {
  const { isInstructor } = useAuth();
  return useQuery({
    queryKey: ["instructor-courses"],
    queryFn: ({ signal }) => api.instructor.courses(signal),
    enabled: isInstructor,
  });
}

export function useInstructorStats() {
  const { isInstructor } = useAuth();
  return useQuery({
    queryKey: ["instructor-stats"],
    queryFn: ({ signal }) => api.instructor.stats(signal),
    enabled: isInstructor,
  });
}

function useCourseMutation(mutationFn, courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-stats"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ["course", String(courseId)] });
        queryClient.invalidateQueries({ queryKey: ["course-content", String(courseId)] });
      }
    },
  });
}

export function useCreateCourse() {
  return useCourseMutation((payload) => api.instructor.createCourse(payload));
}

export function useUpdateCourse(courseId) {
  return useCourseMutation(
    (payload) => api.instructor.updateCourse(courseId, payload),
    courseId
  );
}

export function useDeleteCourse() {
  return useCourseMutation((courseId) => api.instructor.deleteCourse(courseId));
}

export function useCurriculum(courseId) {
  const createSection = useCourseMutation(
    (payload) => api.instructor.createSection(courseId, payload),
    courseId
  );
  const updateSection = useCourseMutation(
    ({ sectionId, ...payload }) => api.instructor.updateSection(sectionId, payload),
    courseId
  );
  const deleteSection = useCourseMutation(
    (sectionId) => api.instructor.deleteSection(sectionId),
    courseId
  );
  const createLesson = useCourseMutation(
    ({ sectionId, ...payload }) => api.instructor.createLesson(sectionId, payload),
    courseId
  );
  const updateLesson = useCourseMutation(
    ({ lessonId, ...payload }) => api.instructor.updateLesson(lessonId, payload),
    courseId
  );
  const deleteLesson = useCourseMutation(
    (lessonId) => api.instructor.deleteLesson(lessonId),
    courseId
  );

  return {
    createSection,
    updateSection,
    deleteSection,
    createLesson,
    updateLesson,
    deleteLesson,
  };
}
