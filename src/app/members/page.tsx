/* eslint-disable @next/next/no-img-element -- 프로필 이미지는 사용자가 등록한 외부 URL일 수 있습니다. */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getTrainingCourseName,
  getTrainingPeriod,
  getTrainingStartedAt,
  normalizeTrainingCourse,
  type TrainingCourse,
  type TrainingCourseProfile,
} from "@/lib/training-course";

type Member = TrainingCourseProfile & {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  role: string;
};

const OTHER_COURSE_VALUE = "OTHER";

function courseLabel(course: TrainingCourse) {
  return `${course.name} (${getTrainingPeriod({
    training_course_id: course.id,
    custom_training_course: null,
    custom_training_started_at: null,
    custom_training_ended_at: null,
    training_course: course,
  })})`;
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const [membersResult, coursesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, name, avatar_url, bio, github_url, portfolio_url, training_course_id, custom_training_course, custom_training_started_at, custom_training_ended_at, role, training_course:training_courses(id, name, started_at, ended_at, signup_enabled)",
          )
          .order("name"),
        supabase
          .from("training_courses")
          .select("id, name, started_at, ended_at, signup_enabled")
          .order("started_at", { ascending: false }),
      ]);

      if (!isMounted) return;

      if (membersResult.error || coursesResult.error) {
        setErrorMessage("회원 또는 훈련과정 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
      } else {
        setMembers(
          (membersResult.data ?? []).map((member) => ({
            ...member,
            training_course: normalizeTrainingCourse(member.training_course),
          })) as unknown as Member[],
        );
        setCourses((coursesResult.data ?? []) as TrainingCourse[]);
      }
      setIsLoading(false);
    }

    void loadMembers();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map((member) => getTrainingStartedAt(member)?.slice(0, 4))
            .filter((year): year is string => Boolean(year)),
        ),
      ).sort((first, second) => second.localeCompare(first)),
    [members],
  );

  const filteredMembers = members.filter((member) => {
    const hasCourse =
      !selectedCourse ||
      (selectedCourse === OTHER_COURSE_VALUE
        ? !member.training_course_id && Boolean(member.custom_training_course?.trim())
        : member.training_course_id === selectedCourse);
    const hasYear =
      !selectedYear || getTrainingStartedAt(member)?.startsWith(selectedYear);
    return hasCourse && hasYear;
  });

  if (isLoading) {
    return <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-600 sm:px-6">회원 목록을 불러오는 중입니다.</div>;
  }

  if (errorMessage) {
    return <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p></div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <section>
        <p className="text-sm font-semibold text-blue-700">MEMBERS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">회원목록</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">함께 배우고 성장하는 커뮤니티 회원을 만나보세요.</p>
      </section>

      <section aria-label="회원 필터" className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="training-course" className="block text-sm font-medium text-slate-800">훈련과정</label>
          <select id="training-course" value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="">전체 훈련과정</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{courseLabel(course)}</option>)}
            <option value={OTHER_COURSE_VALUE}>기타</option>
          </select>
        </div>
        <div>
          <label htmlFor="training-year" className="block text-sm font-medium text-slate-800">훈련 시작년도</label>
          <select id="training-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="">전체 년도</option>
            {years.map((year) => <option key={year} value={year}>{year}년</option>)}
          </select>
        </div>
      </section>

      <p className="mt-6 text-sm text-slate-600">총 <span className="font-semibold text-slate-900">{filteredMembers.length}</span>명</p>

      {filteredMembers.length === 0 ? (
        <section className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">{members.length === 0 ? "등록된 회원이 없습니다." : "해당 훈련과정의 회원이 없습니다."}</h2>
          {members.length > 0 && <p className="mt-2 text-sm text-slate-600">다른 훈련과정 또는 년도를 선택해 보세요.</p>}
        </section>
      ) : (
        <section aria-label="회원 목록" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={`${member.name} 프로필 이미지`}
                    className="size-10 shrink-0 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{member.name.slice(0, 1)}</span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold text-slate-950">{member.name}</h2>
                    {member.role === "ADMIN" && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">관리자</span>}
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-600">{getTrainingCourseName(member)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{member.bio || "자기소개를 등록하지 않았습니다."}</p>
              <p className="mt-4 text-xs text-slate-500">{getTrainingPeriod(member)}</p>
              {(member.github_url || member.portfolio_url) && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
                  {member.github_url && <a href={member.github_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-800">GitHub</a>}
                  {member.portfolio_url && <a href={member.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-800">Portfolio</a>}
                </div>
              )}
              <Link href={`/members/${member.id}`} className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">프로필 보기</Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
