export type TrainingCourse = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string;
  signup_enabled?: boolean;
};

export type TrainingCourseProfile = {
  training_course_id: string | null;
  custom_training_course: string | null;
  custom_training_started_at: string | null;
  custom_training_ended_at: string | null;
  training_course: TrainingCourse | null;
};

export function normalizeTrainingCourse(
  course: TrainingCourse | TrainingCourse[] | null | undefined,
) {
  return Array.isArray(course) ? course[0] ?? null : course ?? null;
}

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

export function getTrainingCourseName(profile: TrainingCourseProfile) {
  if (profile.training_course_id) {
    return profile.training_course?.name ?? "훈련과정 정보 없음";
  }

  return profile.custom_training_course?.trim() || "훈련과정 정보 없음";
}

export function getTrainingStartedAt(profile: TrainingCourseProfile) {
  return profile.training_course_id
    ? profile.training_course?.started_at ?? null
    : profile.custom_training_started_at;
}

export function getTrainingPeriod(profile: TrainingCourseProfile) {
  const startedAt = getTrainingStartedAt(profile);
  const endedAt = profile.training_course_id
    ? profile.training_course?.ended_at ?? null
    : profile.custom_training_ended_at;

  if (!startedAt && !endedAt) {
    return "기간 정보 없음";
  }

  return `${startedAt ? formatDate(startedAt) : ""} ~ ${endedAt ? formatDate(endedAt) : ""}`;
}
