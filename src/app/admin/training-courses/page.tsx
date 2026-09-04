"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TrainingCourse = { id: string; name: string; started_at: string; ended_at: string; signup_enabled: boolean; created_at: string; updated_at: string };

function formatDate(date: string) { return date.replaceAll("-", "."); }

export default function TrainingCoursesPage() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingCourseId, setUpdatingCourseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      const { data, error } = await supabase
        .from("training_courses")
        .select("id, name, started_at, ended_at, signup_enabled, created_at, updated_at")
        .order("started_at", { ascending: false });

      if (!isMounted) return;
      if (error) setErrorMessage("훈련과정 목록을 불러오지 못했습니다.");
      else setCourses((data ?? []) as TrainingCourse[]);
      setIsLoading(false);
    }

    void loadCourses();
    return () => { isMounted = false; };
  }, []);

  async function toggleSignupEnabled(course: TrainingCourse) {
    setErrorMessage("");
    setUpdatingCourseId(course.id);
    const { data, error } = await supabase
      .from("training_courses")
      .update({ signup_enabled: !course.signup_enabled })
      .eq("id", course.id)
      .select("id, signup_enabled")
      .maybeSingle();
    setUpdatingCourseId(null);

    if (error || !data) {
      setErrorMessage("가입 선택 상태 변경에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    setCourses((currentCourses) => currentCourses.map((currentCourse) => currentCourse.id === course.id ? { ...currentCourse, signup_enabled: !course.signup_enabled } : currentCourse));
  }

  if (isLoading) return <div className="mx-auto w-full max-w-4xl px-4 py-16 text-sm text-slate-600 sm:px-6">훈련과정을 불러오는 중입니다.</div>;
  if (errorMessage && courses.length === 0) return <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p></div>;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">ADMIN</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">훈련과정 관리</h1></div><Link href="/admin/training-courses/new" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">훈련과정 추가</Link></section>
      {courses.length === 0 ? <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h2 className="text-base font-semibold text-slate-900">등록된 훈련과정이 없습니다.</h2><Link href="/admin/training-courses/new" className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">훈련과정 추가</Link></section> : <ul className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">{courses.map((course) => <li key={course.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-6"><div className="min-w-0"><h2 className="break-words text-lg font-semibold text-slate-950">{course.name}</h2><p className="mt-2 text-sm text-slate-600">{formatDate(course.started_at)} ~ {formatDate(course.ended_at)}</p><p className={`mt-2 text-sm font-medium ${course.signup_enabled ? "text-emerald-700" : "text-slate-500"}`}>{course.signup_enabled ? "가입 선택 가능" : "가입 선택 안 함"}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Link href={`/admin/training-courses/${course.id}/edit`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">수정</Link><button type="button" disabled={updatingCourseId === course.id} onClick={() => void toggleSignupEnabled(course)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">{updatingCourseId === course.id ? "변경 중..." : course.signup_enabled ? "가입 비활성화" : "가입 활성화"}</button></div></li>)}</ul>}
      {errorMessage && courses.length > 0 && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
    </div>
  );
}
