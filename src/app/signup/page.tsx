"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TrainingCourse = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string;
};

const OTHER_COURSE_VALUE = "OTHER";

function formatCoursePeriod(startedAt: string, endedAt: string) {
  return `${startedAt.replaceAll("-", ".")} ~ ${endedAt.replaceAll("-", ".")}`;
}

export default function SignUpPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [customCourseName, setCustomCourseName] = useState("");
  const [customStartedAt, setCustomStartedAt] = useState("");
  const [customEndedAt, setCustomEndedAt] = useState("");
  const [coursesError, setCoursesError] = useState("");
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId,
  );

  useEffect(() => {
    async function loadCourses() {
      const { data, error } = await supabase
        .from("training_courses")
        .select("id, name, started_at, ended_at")
        .eq("signup_enabled", true)
        .order("started_at", { ascending: false });

      if (error) {
        setCoursesError("훈련과정 목록을 불러오지 못했습니다.");
      } else {
        setCourses((data ?? []) as TrainingCourse[]);
      }

      setIsCoursesLoading(false);
    }

    void loadCourses();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(
      formData.get("passwordConfirmation") ?? "",
    );

    if (password !== passwordConfirmation) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (coursesError) {
      setErrorMessage("훈련과정 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    if (!selectedCourseId) {
      setErrorMessage("훈련과정을 선택해주세요.");
      return;
    }

    const isOtherCourse = selectedCourseId === OTHER_COURSE_VALUE;
    const trimmedCustomCourseName = customCourseName.trim();

    if (!isOtherCourse && !selectedCourse) {
      setErrorMessage("선택한 훈련과정을 다시 확인해 주세요.");
      return;
    }

    if (isOtherCourse && !trimmedCustomCourseName) {
      setErrorMessage("기타 훈련과정명을 입력해 주세요.");
      return;
    }

    if (isOtherCourse && trimmedCustomCourseName.length > 200) {
      setErrorMessage("기타 훈련과정명은 200자 이하로 입력해 주세요.");
      return;
    }

    if (
      isOtherCourse &&
      customStartedAt &&
      customEndedAt &&
      customStartedAt > customEndedAt
    ) {
      setErrorMessage("훈련 시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }

    let trainingMetadata: {
      training_course_id: string | null;
      custom_training_course: string | null;
      custom_training_started_at: string | null;
      custom_training_ended_at: string | null;
    };

    if (isOtherCourse) {
      trainingMetadata = {
        training_course_id: null,
        custom_training_course: trimmedCustomCourseName,
        custom_training_started_at: customStartedAt || null,
        custom_training_ended_at: customEndedAt || null,
      };
    } else {
      if (!selectedCourse) {
        setErrorMessage("선택한 훈련과정을 다시 확인해 주세요.");
        return;
      }

      trainingMetadata = {
        training_course_id: selectedCourse.id,
        custom_training_course: null,
        custom_training_started_at: null,
        custom_training_ended_at: null,
      };
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, ...trainingMetadata },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("회원가입에 실패했습니다. 입력 정보를 확인해 주세요.");
      return;
    }

    setIsSubmitted(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl justify-center px-4 py-12 sm:px-6 sm:py-20">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">JOIN COMMUNITY</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          회원가입
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          수료생 개발자 커뮤니티에 가입하고 동료들과 함께 성장해요.
        </p>

        {isSubmitted ? (
          <div
            role="status"
            className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
          >
            회원가입 요청이 완료되었습니다. 이메일 인증이 설정되어 있다면 받은
            메일을 확인한 뒤 로그인해 주세요.
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-800"
              >
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={50}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-800"
              >
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-800"
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-2 text-xs text-slate-500">8자 이상 입력해 주세요.</p>
            </div>

            <div>
              <label
                htmlFor="passwordConfirmation"
                className="block text-sm font-medium text-slate-800"
              >
                비밀번호 확인
              </label>
              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="trainingCourse"
                className="block text-sm font-medium text-slate-800"
              >
                훈련과정 <span className="text-red-600">*</span>
              </label>
              <select
                id="trainingCourse"
                name="trainingCourse"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                disabled={isCoursesLoading}
                required
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {isCoursesLoading ? "과정을 불러오는 중..." : "선택하세요"}
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} · {formatCoursePeriod(course.started_at, course.ended_at)}
                  </option>
                ))}
                <option value={OTHER_COURSE_VALUE}>기타</option>
              </select>

              {selectedCourse && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {selectedCourse.name}
                  <br />
                  {formatCoursePeriod(
                    selectedCourse.started_at,
                    selectedCourse.ended_at,
                  )}
                </p>
              )}
            </div>

            {selectedCourseId === OTHER_COURSE_VALUE && (
              <div className="space-y-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label
                    htmlFor="customTrainingCourse"
                    className="block text-sm font-medium text-slate-800"
                  >
                    기타 훈련과정명 <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="customTrainingCourse"
                    name="customTrainingCourse"
                    type="text"
                    value={customCourseName}
                    onChange={(event) => setCustomCourseName(event.target.value)}
                    required
                    maxLength={200}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="customTrainingStartedAt"
                      className="block text-sm font-medium text-slate-800"
                    >
                      훈련 시작일
                    </label>
                    <input
                      id="customTrainingStartedAt"
                      name="customTrainingStartedAt"
                      type="date"
                      value={customStartedAt}
                      onChange={(event) => setCustomStartedAt(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customTrainingEndedAt"
                      className="block text-sm font-medium text-slate-800"
                    >
                      훈련 종료일
                    </label>
                    <input
                      id="customTrainingEndedAt"
                      name="customTrainingEndedAt"
                      type="date"
                      value={customEndedAt}
                      onChange={(event) => setCustomEndedAt(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {coursesError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {coursesError}
              </p>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {isSubmitting ? "가입 중..." : "회원가입"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          이미 계정이 있나요?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-700 hover:text-blue-800"
          >
            로그인
          </Link>
        </p>
      </section>
    </div>
  );
}
